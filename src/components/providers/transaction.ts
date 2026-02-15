

const INTEREST_IDL = {
    "address": "AM4tcZNBHBGaDeLEPgzuoEJbHbXqn2odYm9yXC93iUu",
    "metadata": {
        "name": "interest",
        "version": "0.1.0",
        "spec": "0.1.0",
        "description": "Created with Anchor"
    },
    "instructions": [
        {
            "name": "deposit_collateral",
            "discriminator": [
                156,
                131,
                142,
                116,
                146,
                247,
                162,
                120
            ],
            "accounts": [
                {
                    "name": "user",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "token_mint"
                },
                {
                    "name": "user_token_account",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_program"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ],
                        "program": {
                            "kind": "const",
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ]
                        }
                    }
                },
                {
                    "name": "user_data",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    117,
                                    115,
                                    101,
                                    114
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "deposit",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    100,
                                    101,
                                    112,
                                    111,
                                    115,
                                    105,
                                    116
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "config",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    99,
                                    111,
                                    110,
                                    102,
                                    105,
                                    103
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "vault",
                    "writable": true
                },
                {
                    "name": "token_program"
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                },
                {
                    "name": "associated_token_program",
                    "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "give_liquidity",
            "discriminator": [
                243,
                205,
                169,
                207,
                77,
                123,
                63,
                7
            ],
            "accounts": [
                {
                    "name": "user",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "token_mint"
                },
                {
                    "name": "user_token_account",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_program"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ],
                        "program": {
                            "kind": "const",
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ]
                        }
                    }
                },
                {
                    "name": "lp_data",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    108,
                                    112
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "liq_deposit",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    108,
                                    105,
                                    113,
                                    95,
                                    100,
                                    101,
                                    112,
                                    111,
                                    115,
                                    105,
                                    116
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "config",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    99,
                                    111,
                                    110,
                                    102,
                                    105,
                                    103
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "vault",
                    "writable": true
                },
                {
                    "name": "token_program"
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                },
                {
                    "name": "associated_token_program",
                    "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "liquidate_user",
            "discriminator": [
                121,
                20,
                69,
                108,
                54,
                153,
                66,
                95
            ],
            "accounts": [
                {
                    "name": "engine",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    101,
                                    110,
                                    103,
                                    105,
                                    110,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "user_data",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    117,
                                    115,
                                    101,
                                    114
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user_data.user",
                                "account": "UserData"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "deposit",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    100,
                                    101,
                                    112,
                                    111,
                                    115,
                                    105,
                                    116
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user_data.user",
                                "account": "UserData"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "liquidator",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "token_mint"
                },
                {
                    "name": "config",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    99,
                                    111,
                                    110,
                                    102,
                                    105,
                                    103
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "vault",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account",
                                "path": "config"
                            },
                            {
                                "kind": "account",
                                "path": "token_program"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ],
                        "program": {
                            "kind": "const",
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ]
                        }
                    }
                },
                {
                    "name": "liquidator_token_account",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account",
                                "path": "liquidator"
                            },
                            {
                                "kind": "account",
                                "path": "token_program"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ],
                        "program": {
                            "kind": "const",
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ]
                        }
                    }
                },
                {
                    "name": "dsc_mint",
                    "writable": true
                },
                {
                    "name": "liquidator_dsc_account",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account",
                                "path": "liquidator"
                            },
                            {
                                "kind": "account",
                                "path": "token_program"
                            },
                            {
                                "kind": "account",
                                "path": "dsc_mint"
                            }
                        ],
                        "program": {
                            "kind": "const",
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ]
                        }
                    }
                },
                {
                    "name": "price",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    112,
                                    114,
                                    105,
                                    99,
                                    101
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                },
                {
                    "name": "token_program"
                },
                {
                    "name": "associated_token_program",
                    "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
                }
            ],
            "args": [
                {
                    "name": "debt_to_cover",
                    "type": "u64"
                },
                {
                    "name": "new_price",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "mint_dsc",
            "discriminator": [
                142,
                219,
                102,
                161,
                136,
                60,
                179,
                173
            ],
            "accounts": [
                {
                    "name": "engine",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    101,
                                    110,
                                    103,
                                    105,
                                    110,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "user_data",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    117,
                                    115,
                                    101,
                                    114
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "token_mint",
                    "relations": [
                        "config"
                    ]
                },
                {
                    "name": "user",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "dsc_mint",
                    "writable": true
                },
                {
                    "name": "deposit",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    100,
                                    101,
                                    112,
                                    111,
                                    115,
                                    105,
                                    116
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "config",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    99,
                                    111,
                                    110,
                                    102,
                                    105,
                                    103
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "price",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    112,
                                    114,
                                    105,
                                    99,
                                    101
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "user_dsc_account",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_program"
                            },
                            {
                                "kind": "account",
                                "path": "dsc_mint"
                            }
                        ],
                        "program": {
                            "kind": "const",
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ]
                        }
                    }
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                },
                {
                    "name": "token_program"
                },
                {
                    "name": "associated_token_program",
                    "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                },
                {
                    "name": "new_price",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "redeem_liquidity",
            "discriminator": [
                180,
                117,
                142,
                137,
                227,
                225,
                97,
                211
            ],
            "accounts": [
                {
                    "name": "user",
                    "writable": true,
                    "signer": true,
                    "relations": [
                        "liq_deposit"
                    ]
                },
                {
                    "name": "lp_data",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    108,
                                    112
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "token_mint",
                    "relations": [
                        "liq_deposit",
                        "config"
                    ]
                },
                {
                    "name": "liq_deposit",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    108,
                                    105,
                                    113,
                                    95,
                                    100,
                                    101,
                                    112,
                                    111,
                                    115,
                                    105,
                                    116
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "config",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    99,
                                    111,
                                    110,
                                    102,
                                    105,
                                    103
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "vault",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account",
                                "path": "config"
                            },
                            {
                                "kind": "account",
                                "path": "token_program"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ],
                        "program": {
                            "kind": "const",
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ]
                        }
                    }
                },
                {
                    "name": "user_token_account",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_program"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ],
                        "program": {
                            "kind": "const",
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ]
                        }
                    }
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                },
                {
                    "name": "associated_token_program",
                    "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
                },
                {
                    "name": "token_program"
                }
            ],
            "args": []
        },
        {
            "name": "start_engine",
            "discriminator": [
                47,
                24,
                94,
                248,
                13,
                125,
                158,
                142
            ],
            "accounts": [
                {
                    "name": "engine",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    101,
                                    110,
                                    103,
                                    105,
                                    110,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "authority",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "dsc_mint"
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                },
                {
                    "name": "token_program"
                }
            ],
            "args": [
                {
                    "name": "liquidation_threshold",
                    "type": "u64"
                },
                {
                    "name": "min_health_factor",
                    "type": "u64"
                },
                {
                    "name": "liquidation_bonus",
                    "type": "u64"
                },
                {
                    "name": "fee_percent",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "start_token",
            "discriminator": [
                253,
                172,
                159,
                168,
                69,
                117,
                168,
                65
            ],
            "accounts": [
                {
                    "name": "config",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    99,
                                    111,
                                    110,
                                    102,
                                    105,
                                    103
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "price",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    112,
                                    114,
                                    105,
                                    99,
                                    101
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "token_mint"
                },
                {
                    "name": "vault",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account",
                                "path": "config"
                            },
                            {
                                "kind": "account",
                                "path": "token_program"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ],
                        "program": {
                            "kind": "const",
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ]
                        }
                    }
                },
                {
                    "name": "admin",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                },
                {
                    "name": "token_program"
                },
                {
                    "name": "associated_token_program",
                    "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
                }
            ],
            "args": [
                {
                    "name": "_price",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "temp",
            "discriminator": [
                221,
                138,
                209,
                235,
                107,
                243,
                152,
                193
            ],
            "accounts": [
                {
                    "name": "user",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "user_data",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    117,
                                    115,
                                    101,
                                    114
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "token_mint"
                }
            ],
            "args": [
                {
                    "name": "hfbn",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "withdraw_collateral",
            "discriminator": [
                115,
                135,
                168,
                106,
                139,
                214,
                138,
                150
            ],
            "accounts": [
                {
                    "name": "user",
                    "writable": true,
                    "signer": true,
                    "relations": [
                        "deposit"
                    ]
                },
                {
                    "name": "user_data",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    117,
                                    115,
                                    101,
                                    114
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "engine",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    101,
                                    110,
                                    103,
                                    105,
                                    110,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "token_mint",
                    "relations": [
                        "deposit",
                        "price",
                        "config"
                    ]
                },
                {
                    "name": "dsc_mint",
                    "writable": true
                },
                {
                    "name": "deposit",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    100,
                                    101,
                                    112,
                                    111,
                                    115,
                                    105,
                                    116
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "price",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    112,
                                    114,
                                    105,
                                    99,
                                    101
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "config",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    99,
                                    111,
                                    110,
                                    102,
                                    105,
                                    103
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "vault",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account",
                                "path": "config"
                            },
                            {
                                "kind": "account",
                                "path": "token_program"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ],
                        "program": {
                            "kind": "const",
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ]
                        }
                    }
                },
                {
                    "name": "user_token_account",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_program"
                            },
                            {
                                "kind": "account",
                                "path": "token_mint"
                            }
                        ],
                        "program": {
                            "kind": "const",
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ]
                        }
                    }
                },
                {
                    "name": "user_dsc_account",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "token_program"
                            },
                            {
                                "kind": "account",
                                "path": "dsc_mint"
                            }
                        ],
                        "program": {
                            "kind": "const",
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ]
                        }
                    }
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                },
                {
                    "name": "associated_token_program",
                    "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
                },
                {
                    "name": "token_program"
                }
            ],
            "args": [
                {
                    "name": "dsc_to_give",
                    "type": "u64"
                },
                {
                    "name": "new_price",
                    "type": "u64"
                }
            ]
        }
    ],
    "accounts": [
        {
            "name": "Config",
            "discriminator": [
                155,
                12,
                170,
                224,
                30,
                250,
                204,
                130
            ]
        },
        {
            "name": "Deposit",
            "discriminator": [
                148,
                146,
                121,
                66,
                207,
                173,
                21,
                227
            ]
        },
        {
            "name": "Engine",
            "discriminator": [
                246,
                94,
                41,
                147,
                231,
                121,
                110,
                19
            ]
        },
        {
            "name": "LpData",
            "discriminator": [
                248,
                173,
                196,
                3,
                123,
                50,
                218,
                10
            ]
        },
        {
            "name": "LqDeposit",
            "discriminator": [
                39,
                77,
                98,
                106,
                180,
                33,
                68,
                207
            ]
        },
        {
            "name": "Price",
            "discriminator": [
                50,
                107,
                127,
                61,
                83,
                36,
                39,
                75
            ]
        },
        {
            "name": "UserData",
            "discriminator": [
                139,
                248,
                167,
                203,
                253,
                220,
                210,
                221
            ]
        }
    ],
    "events": [
        {
            "name": "HealthFactors",
            "discriminator": [
                180,
                101,
                77,
                160,
                202,
                252,
                201,
                107
            ]
        },
        {
            "name": "LiquidityProvided",
            "discriminator": [
                94,
                97,
                39,
                34,
                15,
                96,
                79,
                135
            ]
        },
        {
            "name": "LiquidityRedeemed",
            "discriminator": [
                78,
                81,
                213,
                176,
                1,
                84,
                138,
                65
            ]
        },
        {
            "name": "TokenDeposited",
            "discriminator": [
                104,
                7,
                18,
                187,
                94,
                141,
                251,
                120
            ]
        },
        {
            "name": "TokenLiquidated",
            "discriminator": [
                106,
                151,
                243,
                246,
                247,
                212,
                191,
                12
            ]
        },
        {
            "name": "TokenRedeemed",
            "discriminator": [
                75,
                7,
                43,
                228,
                204,
                167,
                97,
                76
            ]
        }
    ],
    "errors": [
        {
            "code": 6000,
            "name": "AmountLessThanZero",
            "msg": "Amount must be greater than zero"
        },
        {
            "code": 6001,
            "name": "InvalidToken",
            "msg": "Invalid token"
        },
        {
            "code": 6002,
            "name": "LessHealthFactor",
            "msg": "Health factor too low"
        },
        {
            "code": 6003,
            "name": "NotEnoughTokensInCollateral",
            "msg": "Not enough tokens in collateral"
        },
        {
            "code": 6004,
            "name": "NoNeedToLiquidate",
            "msg": "No need to liquidate"
        },
        {
            "code": 6005,
            "name": "HealthFactorNotImproved",
            "msg": "Health factor not improved"
        },
        {
            "code": 6006,
            "name": "NotEnoughDebt",
            "msg": "Not enough debt"
        },
        {
            "code": 6007,
            "name": "UnauthorizedUser",
            "msg": "Unauthorized user"
        },
        {
            "code": 6008,
            "name": "Overflow"
        },
        {
            "code": 6009,
            "name": "DivisionError"
        },
        {
            "code": 6010,
            "name": "InvalidPrice"
        },
        {
            "code": 6011,
            "name": "MathOverflow"
        },
        {
            "code": 6012,
            "name": "MustRepayDscFirst"
        },
        {
            "code": 6013,
            "name": "ZeroTotalLiquidity"
        },
        {
            "code": 6014,
            "name": "CannotLiquidateSelf"
        },
        {
            "code": 6015,
            "name": "TooMuchRepay"
        },
        {
            "code": 6016,
            "name": "OverCollateralLimit"
        },
        {
            "code": 6017,
            "name": "LiquidatorInsufficientDSC"
        }
    ],
    "types": [
        {
            "name": "Config",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "token_mint",
                        "type": "pubkey"
                    },
                    {
                        "name": "total_liq",
                        "type": "u64"
                    },
                    {
                        "name": "total_collected",
                        "type": "u64"
                    },
                    {
                        "name": "vault",
                        "type": "pubkey"
                    },
                    {
                        "name": "authority",
                        "type": "pubkey"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "Deposit",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "user",
                        "type": "pubkey"
                    },
                    {
                        "name": "token_mint",
                        "type": "pubkey"
                    },
                    {
                        "name": "token_amt",
                        "type": "u64"
                    },
                    {
                        "name": "config_account",
                        "type": "pubkey"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "Engine",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "authority",
                        "type": "pubkey"
                    },
                    {
                        "name": "dsc_mint",
                        "type": "pubkey"
                    },
                    {
                        "name": "liquidation_threshold",
                        "type": "u64"
                    },
                    {
                        "name": "min_health_factor",
                        "type": "u64"
                    },
                    {
                        "name": "liquidation_bonus",
                        "type": "u64"
                    },
                    {
                        "name": "fee_percent",
                        "type": "u64"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "HealthFactors",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "health_factor",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "LiquidityProvided",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "user",
                        "type": "pubkey"
                    },
                    {
                        "name": "token",
                        "type": "pubkey"
                    },
                    {
                        "name": "amount",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "LiquidityRedeemed",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "user",
                        "type": "pubkey"
                    },
                    {
                        "name": "token",
                        "type": "pubkey"
                    },
                    {
                        "name": "interest",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "LpData",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "user",
                        "type": "pubkey"
                    },
                    {
                        "name": "token_amt",
                        "type": "u64"
                    },
                    {
                        "name": "token",
                        "type": "pubkey"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "LqDeposit",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "user",
                        "type": "pubkey"
                    },
                    {
                        "name": "token_mint",
                        "type": "pubkey"
                    },
                    {
                        "name": "token_amt",
                        "type": "u64"
                    },
                    {
                        "name": "config_account",
                        "type": "pubkey"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "Price",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "token_mint",
                        "type": "pubkey"
                    },
                    {
                        "name": "price",
                        "type": "u64"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "TokenDeposited",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "user",
                        "type": "pubkey"
                    },
                    {
                        "name": "token",
                        "type": "pubkey"
                    },
                    {
                        "name": "amount",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "TokenLiquidated",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "liquidator",
                        "type": "pubkey"
                    },
                    {
                        "name": "user",
                        "type": "pubkey"
                    },
                    {
                        "name": "token",
                        "type": "pubkey"
                    },
                    {
                        "name": "amount",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "TokenRedeemed",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "user",
                        "type": "pubkey"
                    },
                    {
                        "name": "token",
                        "type": "pubkey"
                    },
                    {
                        "name": "amount",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "UserData",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "user",
                        "type": "pubkey"
                    },
                    {
                        "name": "borrowed_amount",
                        "type": "u64"
                    },
                    {
                        "name": "primary_token",
                        "type": "pubkey"
                    },
                    {
                        "name": "hf",
                        "type": "u64"
                    },
                    {
                        "name": "token_balance",
                        "type": "u64"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        }
    ],
    "constants": [
        {
            "name": "MAXIMUM_AGE",
            "type": "u64",
            "value": "100"
        }
    ]
};

export interface DecodedInstruction {
    instructionName: string;
    summary: string;
    args: Record<string, any>;
    programId: string;
}

interface SolanaInstruction {
    programId: { toString: () => string };
    data: string;
    parsed?: {
        type?: string;
        info?: Record<string, any>;
    };
    program?: string;
}

// make sure bs58 is installed

const decodeInstructionData = (data: string): Uint8Array => {
    // Try base64 first, fallback to base58

    return base64ToUint8Array(data);

};

export const logInstructionDiscriminator = (instruction: SolanaInstruction) => {
    const data = instruction.data;
    if (!data) {
        console.log("No data in instruction.");
        return;
    }

    const dataBytes = decodeInstructionData(data);
    const discriminator = Array.from(dataBytes.slice(0, 8));

    console.log("---- Instruction Debug ----");
    console.log("Program ID:", instruction.programId?.toString());
    console.log("Raw Data (first 20 chars):", data.slice(0, 20) + "...");
    console.log("Decoded Bytes Length:", dataBytes.length);
    console.log("Discriminator (first 8 bytes):", discriminator);

    console.log("Checking against INTEREST_IDL...");
    INTEREST_IDL.instructions.forEach((ix) => {
        const matches = JSON.stringify(ix.discriminator) === JSON.stringify(discriminator);
        console.log(` - ${ix.name}: ${ix.discriminator} => MATCH? ${matches}`);
    });
    console.log("---------------------------");
};


// Browser-compatible base64 to Uint8Array conversion
const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

// Browser-compatible function to read i64 from bytes
const readBigInt64LE = (bytes: Uint8Array, offset: number): bigint => {
    let result = 0n;
    for (let i = 0; i < 8; i++) {
        result |= BigInt(bytes[offset + i]) << (BigInt(i) * 8n);
    }
    return result;
};

const formatTokenAmount = (amount: bigint, decimals: number = 6): string => {
    const divisor = BigInt(10 ** decimals);
    const wholePart = amount / divisor;
    const fractionalPart = amount % divisor;

    if (fractionalPart === 0n) {
        return wholePart.toString();
    }

    // Format fractional part, remove trailing zeros
    return `${wholePart}.${fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
};

const getGenericInstructionSummary = (instruction: SolanaInstruction): string => {
    if (instruction.parsed?.type) {
        const info = instruction.parsed.info || {};

        switch (instruction.parsed.type) {
            case "transfer":
                return `Transferred ${info.amount || "unknown"} tokens from ${info.source || "unknown"} to ${info.destination || "unknown"}`;

            case "transferChecked":
                return `Transferred ${info.amount || "unknown"} tokens (checked) from ${info.source || "unknown"} to ${info.destination || "unknown"}`;

            case "mintTo":
                return `Minted ${info.amount || "unknown"} tokens to ${info.account || "unknown"}`;

            case "burn":
                return `Burned ${info.amount || "unknown"} tokens from ${info.account || "unknown"}`;

            case "approve":
                return `Approved ${info.delegate || "unknown"} to spend ${info.amount || "unknown"} tokens`;

            case "createAccount":
                return `Created account ${info.newAccount || "unknown"}`;

            case "closeAccount":
                return `Closed account ${info.account || "unknown"}`;

            case "initializeAccount":
                return `Initialized account ${info.account || "unknown"}`;

            case "initializeMint":
                return `Initialized mint with ${info.decimals || "unknown"} decimals`;

            default:
                return `${instruction.parsed.type} instruction`;
        }
    }

    if (instruction.program) {
        return `${instruction.program} program call`;
    }

    return "Unknown instruction";
};

export const getProgramName = (programId: string): string => {
    const knownPrograms: Record<string, string> = {
        [INTEREST_IDL.address]: 'Interest Protocol',
        '11111111111111111111111111111111': 'System Program',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Program'
    }

    return knownPrograms[programId] || `Unknown Program (${programId.slice(0, 8)}...)`;
};


export const decodeInstruction = (instruction: SolanaInstruction): DecodedInstruction => {
    const programId = instruction.programId?.toString();
    const data = instruction.data;

    console.log('Decoding instruction:', { programId, data: data ? data.slice(0, 20) + '...' : 'no data' });

    // Check if this is our interest program
    if (programId === INTEREST_IDL.address && data) {
        try {
            // Convert base64 data to bytes for discriminator comparison
            const dataBytes = base64ToUint8Array(data);

            console.log('Data bytes length:', dataBytes.length);
            console.log('First 8 bytes (discriminator):', Array.from(dataBytes.slice(0, 8)));

            if (dataBytes.length >= 8) {
                const discriminator = Array.from(dataBytes.slice(0, 8));

                console.log('Looking for discriminator:', discriminator);

                // Find matching instruction by discriminator
                const matchingInstruction = INTEREST_IDL.instructions.find(ix => {
                    const matches = JSON.stringify(ix.discriminator) === JSON.stringify(discriminator);
                    console.log(`Checking ${ix.name}:`, ix.discriminator, 'matches:', matches);
                    return matches;
                });

                if (matchingInstruction) {
                    console.log('Found matching instruction:', matchingInstruction.name);
                    const decodedArgs: Record<string, any> = {};
                    let summary = '';

                    switch (matchingInstruction.name) {
                        case 'deposit_collateral': {
                            if (dataBytes.length >= 16) {
                                const amount = readBigInt64LE(dataBytes, 8);
                                decodedArgs.amount = amount.toString();
                                summary = `Deposited ${formatTokenAmount(amount)} as collateral`;
                            } else {
                                summary = 'Deposited collateral';
                            }
                            break;
                        }

                        case 'give_liquidity': {
                            if (dataBytes.length >= 16) {
                                const amount = readBigInt64LE(dataBytes, 8);
                                decodedArgs.amount = amount.toString();
                                summary = `Gave ${formatTokenAmount(amount)} liquidity`;
                            } else {
                                summary = 'Gave liquidity';
                            }
                            break;
                        }

                        case 'liquidate_user': {
                            if (dataBytes.length >= 24) {
                                const debtToCover = readBigInt64LE(dataBytes, 8);
                                const newPrice = readBigInt64LE(dataBytes, 16);
                                decodedArgs.debtToCover = debtToCover.toString();
                                decodedArgs.newPrice = newPrice.toString();
                                summary = `Liquidated user with debt ${formatTokenAmount(debtToCover)}, price set to ${newPrice}`;
                            } else {
                                summary = 'Liquidated user';
                            }
                            break;
                        }

                        case 'mint_dsc': {
                            if (dataBytes.length >= 24) {
                                const amount = readBigInt64LE(dataBytes, 8);
                                const newPrice = readBigInt64LE(dataBytes, 16);
                                decodedArgs.amount = amount.toString();
                                decodedArgs.newPrice = newPrice.toString();
                                summary = `Minted DSC: ${formatTokenAmount(amount)}, price ${newPrice}`;
                            } else {
                                summary = 'Minted DSC';
                            }
                            break;
                        }

                        case 'redeem_liquidity': {
                            summary = 'Redeemed liquidity';
                            break;
                        }

                        case 'start_engine': {
                            if (dataBytes.length >= 40) {
                                const liquidationThreshold = readBigInt64LE(dataBytes, 8);
                                const minHealthFactor = readBigInt64LE(dataBytes, 16);
                                const liquidationBonus = readBigInt64LE(dataBytes, 24);
                                const feePercent = readBigInt64LE(dataBytes, 32);
                                decodedArgs.liquidationThreshold = liquidationThreshold.toString();
                                decodedArgs.minHealthFactor = minHealthFactor.toString();
                                decodedArgs.liquidationBonus = liquidationBonus.toString();
                                decodedArgs.feePercent = feePercent.toString();
                                summary = `Engine started (Threshold: ${liquidationThreshold}, MinHF: ${minHealthFactor}, Bonus: ${liquidationBonus}, Fee: ${feePercent}%)`;
                            } else {
                                summary = 'Engine started';
                            }
                            break;
                        }

                        case 'start_token': {
                            if (dataBytes.length >= 16) {
                                const price = readBigInt64LE(dataBytes, 8);
                                decodedArgs.price = price.toString();
                                summary = `Token started with price ${price}`;
                            } else {
                                summary = 'Token started';
                            }
                            break;
                        }

                        case 'temp': {
                            if (dataBytes.length >= 16) {
                                const hfbn = readBigInt64LE(dataBytes, 8);
                                decodedArgs.hfbn = hfbn.toString();
                                summary = `Temporary HF updated: ${hfbn}`;
                            } else {
                                summary = 'Temp instruction executed';
                            }
                            break;
                        }

                        case 'withdraw_collateral': {
                            if (dataBytes.length >= 24) {
                                const dscToGive = readBigInt64LE(dataBytes, 8);
                                const newPrice = readBigInt64LE(dataBytes, 16);
                                decodedArgs.dscToGive = dscToGive.toString();
                                decodedArgs.newPrice = newPrice.toString();
                                summary = `Withdrew collateral (DSC: ${formatTokenAmount(dscToGive)}, Price: ${newPrice})`;
                            } else {
                                summary = 'Withdrew collateral';
                            }
                            break;
                        }

                        default:
                            summary = `Unknown instruction: ${matchingInstruction.name}`;
                    }

                    return {
                        instructionName: matchingInstruction.name,
                        summary,
                        args: decodedArgs,
                        programId
                    };
                } else {
                    console.log('No matching instruction found for discriminator:', discriminator);
                }
            }
        } catch (error) {
            console.warn('Failed to decode instruction data:', error);
        }
    }

    // Fallback for other programs or failed decoding
    return {
        instructionName: instruction.parsed?.type || instruction.program || 'Failed to Decode',
        summary: getGenericInstructionSummary(instruction),
        args: instruction.parsed?.info || {},
        programId: programId || 'Unknown'
    };
};
