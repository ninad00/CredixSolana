import { AppHero } from '../app-hero';
import StartConfig from './startConfig';
import StartEngine from './startEngine';
import { ExplorerLink } from '../cluster/cluster-ui';
import { DSC_MINT, Interest_PROGRAM_ID } from '../../../anchor/src/source.ts'

export default function InterestFeature() {
    // const engine = "Ah1XT4FXkj1QXVgRxcfXCdihX6RwUdkge6Xry6yER2pC"; // or dynamically from context
    const dscMint = DSC_MINT;

    return (
        <div>
            <AppHero
                title="Interest Program Configuration"
                subtitle={
                    <div className="space-y-2 mt-4">
                        <ExplorerLink label="Program  " path={`address/${Interest_PROGRAM_ID}`} />
                        <br />
                        <ExplorerLink label="DSC Mint" path={`address/${dscMint}`} />
                    </div>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="border rounded-lg p-4 bg-white dark:bg-black">
                        <h3 className="text-lg font-semibold mb-2">Add Config</h3>
                        <StartConfig />
                    </div>

                    <div className="border rounded-lg p-4 bg-white dark:bg-black">
                        <h3 className="text-lg font-semibold mb-2">Start Engine</h3>
                        <StartEngine />
                    </div>
                </div>
            </AppHero>
        </div>
    );
}
