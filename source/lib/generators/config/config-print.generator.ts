import { ConfigModel, EConfigType, StructureModel } from '../../types';
import { ConfigGenerator } from './configGenerator';

class ConfigPrintGenerator extends ConfigGenerator {

    private printLine: string[] = [];

    private addPrintPrimitiveLine(propName: string, type: EConfigType): void {
        let placeholder = "";
        switch (type) {
            case EConfigType.ConfigString:
                placeholder = "%s";
                break;

            case EConfigType.ConfigInt:
                placeholder = "%d";
                break;

            case EConfigType.ConfigDouble:
                placeholder = "%f";
                break;

            case EConfigType.Unknown:
            default:
                return;
        }

        this.printLine.push(`printf("${propName}:\\t${placeholder}\\n", ${propName});`);
    }

    private addPrintPrimitiveArrayLine(propName: string, arrType: EConfigType): void {
        switch (arrType) {
            case EConfigType.ConfigString:
                this.printLine.push(`printf("${propName}: ");`);
                this.printLine.push(`printStringsArray(${propName}, ${propName}_count);`);
                break;

            case EConfigType.ConfigInt:
            case EConfigType.ConfigDouble:
            //TODO: implement c print
            case EConfigType.Unknown:
            default:
                break;
        }

    }

    private parse(data: ConfigModel, name: string): void {
        for (const k in data) {
            const type = this.getConfigType(data[k]);
            switch (type) {
                case EConfigType.ConfigArray:
                    this.addPrintPrimitiveArrayLine(`${name}${k}`, this.getArrayPrimitiveType(data[k] as Array<any>));
                    break;

                case EConfigType.ConfigObject:
                    this.parse(data[k] as ConfigModel, `${name}${k}.`)
                    break;

                case EConfigType.ConfigString:
                case EConfigType.ConfigInt:
                case EConfigType.ConfigDouble:
                    this.addPrintPrimitiveLine(`${name}${k}`, type);
                    break;

                case EConfigType.Unknown:
                default:
                    break;
            }
        }
    }

    protected comment = '{{GENERATE_CONFIG_PRINT}}';
    protected generate(): void {
        this.parse(this.config, 'config->');
        this.code = this.printLine.map(s => "\t" + s).join('\n');
    }

    constructor(structure: StructureModel, config: ConfigModel) {
        super(structure, config);
        this.generate();
    }

}

export { ConfigPrintGenerator as generator };



function test(): void {
    const res = new ConfigPrintGenerator(null, {
        "mqtt": {
            "host": "localhost",
            "port": 1883,
            "data_topic": "telemetria",
            "log_topic": "telemetria_log"
        },

        "mongodb": {
            "host": "localhost",
            "port": 27017,
            "db": "eagle_test",
            "collection": "scimmera"
        },

        "gps": {
            "plugged": 1,
            "simulated": 1,
            "interface": "/dev/pts/3"
        },

        "pilots": [
            "default",
            "Ivan",
            "Filippo",
            "Mirco",
            "Nicola",
            "Davide"
        ],

        "races": [
            "default",
            "Autocross",
            "Skidpad",
            "Endurance",
            "Acceleration"
        ],

        "circuits": [
            "default",
            "Vadena",
            "Varano",
            "Povo"
        ],

        "can_interface": "can0",
        "sending_rate": 500,
        "verbose": 0
    });
    console.log(res.generated.code);
}
test();