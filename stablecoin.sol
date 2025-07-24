// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Stablecoin} from "./stablecoin.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "forge-std/console.sol";

contract DSCEngine is ReentrancyGuard {
    error Engine_amount_lessthanzero();
    error Engine_tokenlist_0();
    error Engine__TokenAddressesAndPriceFeedAddressesAmountsDontMatch();
    error Engine_no_dscContract();
    error Engine_Invalid_token();
    error Engine_token_not_transferred();
    error Engine_less_health_factor(uint256);
    error Engine_not_minted();
    error Engine_not_enough_tokens_in_collateral();
    error Engine_Noneed_to_liquidate();
    error Engine_Healthfactor_not_improved();

    mapping(address user => mapping(address token => uint256 amt)) public s_user_to_collateral;
    mapping(address => uint256) public s_address_to_borrowed;
    mapping(address token => address pricefeed) s_pricefeeds;

    // 🔁 New mappings
    mapping(address => address) public s_userPrimaryToken;
    mapping(address => uint256) public s_totalInterestPerToken;

    address[] private s_collateraltokens;
    address[] private s_all_users;

    Stablecoin private immutable i_dsc;

    uint256 private constant lIQUIDATION_THRESHOLD = 50;
    uint256 private constant lIQUIDATION_PRECISION = 100;
    uint256 public constant min_health_factor = 1e18;
    uint256 private constant liquidation_bonus = 10e18;

    event CollateralDeposited(address indexed user, address indexed token, uint256 indexed amount);
    event CollateralRedeemed(address indexed user, address indexed token, uint256 indexed amount);
    event CollateralLiquidated(address indexed by, address indexed debtholder, address indexed token, uint256 amount);

    modifier amtpositive(uint256 amt) {
        if (amt <= 0) revert Engine_amount_lessthanzero();
        _;
    }

    modifier isTokenAllowed(address token) {
        if (s_pricefeeds[token] == address(0)) revert Engine_Invalid_token();
        _;
    }

    constructor(address[] memory tokens, address[] memory pricefeeds, address dscContract) {
        if (tokens.length <= 0) revert Engine_tokenlist_0();
        if (tokens.length != pricefeeds.length) revert Engine__TokenAddressesAndPriceFeedAddressesAmountsDontMatch();
        if (dscContract == address(0)) revert Engine_no_dscContract();

        i_dsc = Stablecoin(dscContract);

        for (uint256 i = 0; i < tokens.length; i++) {
            s_pricefeeds[tokens[i]] = pricefeeds[i];
            s_collateraltokens.push(tokens[i]);
        }
    }

    function setPrimaryCollateralToken(address token) public isTokenAllowed(token) {
        s_userPrimaryToken[msg.sender] = token;
    }

    function depositCollateral(address _token, uint256 _amount)
        public
        payable
        amtpositive(_amount)
        isTokenAllowed(_token)
        nonReentrant
    {
        s_all_users.push(msg.sender);
        s_user_to_collateral[msg.sender][_token] += _amount;
        emit CollateralDeposited(msg.sender, _token, _amount);
        bool success = IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        if (!success) revert Engine_token_not_transferred();
    }

    function MintDSC(uint256 _DSCtomint) public amtpositive(_DSCtomint) nonReentrant {
        uint256 healthfactor = getHealthFactormultiple(msg.sender, _DSCtomint);
        if (healthfactor < min_health_factor) revert Engine_less_health_factor(healthfactor);

        s_address_to_borrowed[msg.sender] += _DSCtomint;
        bool minted = i_dsc.mint(msg.sender, _DSCtomint);
        if (!minted) revert Engine_not_minted();
    }

    function depositcollateral_and_mint_dsc(address token, uint256 tokenamount, uint256 dscamount) public {
        depositCollateral(token, tokenamount);
        MintDSC(dscamount);
    }

    function redeemCollateral(address tokentype, uint256 tokenamt)
        public
        isTokenAllowed(tokentype)
        amtpositive(tokenamt)
        nonReentrant
    {
        if (tokenamt > s_user_to_collateral[msg.sender][tokentype]) {
            revert Engine_not_enough_tokens_in_collateral();
        }

        uint256 _healthfactor = getHealthFactor(msg.sender);
        if (_healthfactor < min_health_factor) {
            revert Engine_less_health_factor(_healthfactor);
        }

        // 🔁 Interest payment
        address primaryToken = s_userPrimaryToken[msg.sender];
        if (primaryToken == address(0)) revert Engine_Invalid_token();

        uint256 totalBorrowed = s_address_to_borrowed[msg.sender];
        uint256 interestUSD = (totalBorrowed * 8) / 100;
        uint256 interestTokenAmt = getTokenamtfromUSD(primaryToken, interestUSD);

        bool successTransfer = IERC20(primaryToken).transferFrom(msg.sender, address(this), interestTokenAmt);
        if (!successTransfer) revert Engine_token_not_transferred();

        s_totalInterestPerToken[primaryToken] += interestTokenAmt / 2;

        // Proceed with collateral redemption
        s_user_to_collateral[msg.sender][tokentype] -= tokenamt;
        emit CollateralRedeemed(msg.sender, tokentype, tokenamt);
        bool success = IERC20(tokentype).transfer(msg.sender, tokenamt);
        if (!success) revert Engine_token_not_transferred();
    }

    function burnDSC(uint256 amt) public amtpositive(amt) returns (bool) {
        s_address_to_borrowed[msg.sender] -= amt;
        bool success = i_dsc.transferFrom(msg.sender, address(this), amt);
        if (!success) revert Engine_token_not_transferred();
        i_dsc.burn(amt);
        return success;
    }

    struct CollateralInfo {
        address token;
        uint256 amount;
    }

    struct UserDebtInfo {
        address user;
        uint256 debt;
        uint256 healthFactor;
        CollateralInfo[] collaterals;
    }

    function getAllUsersDebtAndLiquidationStatus() public view returns (UserDebtInfo[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < s_all_users.length; i++) {
            if (getHealthFactor(s_all_users[i]) < 1e18) count++;
        }

        UserDebtInfo[] memory userDebtInfos = new UserDebtInfo[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < s_all_users.length; i++) {
            address user = s_all_users[i];
            uint256 healthFactor = getHealthFactor(user);
            if (healthFactor < 1e18) {
                uint256 collateralCount = 0;
                for (uint256 j = 0; j < s_collateraltokens.length; j++) {
                    if (s_user_to_collateral[user][s_collateraltokens[j]] > 0) collateralCount++;
                }

                CollateralInfo[] memory collaterals = new CollateralInfo[](collateralCount);
                uint256 k = 0;
                for (uint256 j = 0; j < s_collateraltokens.length; j++) {
                    address collateralToken = s_collateraltokens[j];
                    uint256 amount = s_user_to_collateral[user][collateralToken];
                    if (amount > 0) {
                        collaterals[k] = CollateralInfo({token: collateralToken, amount: amount});
                        k++;
                    }
                }

                userDebtInfos[index] = UserDebtInfo({
                    user: user,
                    debt: s_address_to_borrowed[user],
                    healthFactor: healthFactor,
                    collaterals: collaterals
                });
                index++;
            }
        }

        return userDebtInfos;
    }

    function liquidate(address collateral, address undercollateralized, uint256 debt_to_cover)
        public
        amtpositive(debt_to_cover)
        nonReentrant
    {
        uint256 iniHealthfactor = getHealthFactor(undercollateralized);
        if (iniHealthfactor >= min_health_factor) revert Engine_Noneed_to_liquidate();

        uint256 tokenamtofdebt = getTokenamtfromUSD(collateral, debt_to_cover);
        uint256 bonusamt = tokenamtofdebt / 10;
        uint256 totalamt = tokenamtofdebt + bonusamt;

        if (totalamt > s_user_to_collateral[undercollateralized][collateral]) {
            revert Engine_not_enough_tokens_in_collateral();
        }

        s_user_to_collateral[undercollateralized][collateral] -= totalamt;
        emit CollateralLiquidated(msg.sender, undercollateralized, collateral, totalamt);
        bool success = IERC20(collateral).transfer(msg.sender, totalamt);
        if (!success) revert Engine_token_not_transferred();

        s_address_to_borrowed[undercollateralized] -= debt_to_cover;
        bool success2 = IERC20(address(i_dsc)).transferFrom(msg.sender, address(this), debt_to_cover);
        if (!success2) revert Engine_token_not_transferred();
        i_dsc.burn(debt_to_cover);

        uint256 endhealthfctor = getHealthFactor(undercollateralized);
        if (iniHealthfactor >= endhealthfctor) revert Engine_Healthfactor_not_improved();
        if (getHealthFactor(msg.sender) < min_health_factor) revert Engine_less_health_factor(getHealthFactor(msg.sender));
    }

    function getDebtOfUser(address user) public view returns (uint256) {
        uint256 healthfactor = getHealthFactor(user);
        if (healthfactor >= min_health_factor) return 0;

        uint256 collateralvalueinUSD = getCollateralvalue(user);
        uint256 collateralthreshold = (collateralvalueinUSD * lIQUIDATION_THRESHOLD) / lIQUIDATION_PRECISION;
        uint256 dscminted = s_address_to_borrowed[user];
        return (dscminted - collateralthreshold) * lIQUIDATION_PRECISION / lIQUIDATION_THRESHOLD;
    }

    function getHealthFactor(address user) public view returns (uint256) {
        (uint256 dscminted, uint256 collateralvalueinUSD) = getUserInfo(user);
        if (dscminted == 0) return type(uint256).max;
        uint256 collateralthreshold = (collateralvalueinUSD * lIQUIDATION_THRESHOLD) / lIQUIDATION_PRECISION;
        return (collateralthreshold * 1e18) / dscminted;
    }

    function getHealthFactormultiple(address user, uint256 borrowcurrent) public view returns (uint256) {
        (uint256 dscminted, uint256 collateralvalueinUSD) = getUserInfo(user);
        uint256 collateralthreshold = (collateralvalueinUSD * lIQUIDATION_THRESHOLD) / lIQUIDATION_PRECISION;
        return ((collateralthreshold * 1e18) / (dscminted + borrowcurrent));
    }

    function getUSDperToken(address _token) public view isTokenAllowed(_token) returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_pricefeeds[_token]);
        (, int256 answer,,,) = priceFeed.latestRoundData();
        return uint256(answer * 1e10);
    }

    function getCollateralvalue(address user) public view returns (uint256) {
        uint256 totalValue = 0;
        for (uint256 i = 0; i < s_collateraltokens.length; i++) {
            address _token = s_collateraltokens[i];
            if (s_user_to_collateral[user][_token] <= 0) continue;
            uint256 rate = getUSDperToken(_token);
            uint256 value = (rate * s_user_to_collateral[user][_token]) / 1e18;
            totalValue += value;
        }
        return totalValue;
    }

    function getTokenamtfromUSD(address token, uint256 usdamt) public view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(s_pricefeeds[token]);
        (, int256 answer,,,) = priceFeed.latestRoundData();
        require(answer > 0, "Invalid price");
        return (usdamt * 1e8) / uint256(answer);
    }

    function getUserInfo(address user) public view returns (uint256 dscminted, uint256 collateralvalueinUSD) {
        dscminted = s_address_to_borrowed[user];
        collateralvalueinUSD = getCollateralvalue(user);
        return (dscminted, collateralvalueinUSD);
    }

    function getTokens() public view returns (address[] memory) {
        return s_collateraltokens;
    }
}
