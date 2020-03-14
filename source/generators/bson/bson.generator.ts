import { Generator } from '../../types';

interface Key {
    key: string;
    type: 'array' | 'object';
};

class BsonGenerator extends Generator {

    private keys: Key[] = [];
    private indentation: number = 0;
    private depth: number = 0;
    private forDepth: number = 0;

    protected print(str: string): void {
        this.code += `${this.indentationTabs}${str}\n`;
    }

    private get maxDepth(): number {
        return this.getDepth(this.structure);
    }

    private get parsedDepth(): string {
        return (this.depth === 0 ? '*bson_document' : `&children[${this.depth - 1}]`);
    }
    
    private get parsedForDepth(): string {
        switch (this.forDepth) {
            case 0:
                return 'i';
            case 1:
                return 'j';
            case 2:
                return 'k';
            default:
                return `k${this.forDepth - 3}`;
        }
    }

    private get parsedKeys(): string {
        return this.keys.reduce((acc, curr) => acc + this.parseKey(curr), '').replace('.', '->');
    }

    private get currentKey(): string {
        const last = this.keys[this.keys.length - 1];
        return last.type === 'array' ? '0' : last.key;
    }

    private get indentationTabs(): string {
        return Array(this.indentation)
            .fill('\t')
            .join('');
    }

    private getDepth(structure: any): number {
        let res: number;
        if (Array.isArray(structure)) {
            res = 1 + this.getDepth(structure[0]);
        }
        else if (typeof structure === 'object') {
            let max = 0;
            for (const key in structure) {
                if (typeof structure[key] === 'object') {
                    const n = 1 + this.getDepth(structure[key]);
                    max = (n > max) ? n : max;
                }
            }
            res = max;
        }
        else {
            res = 0;
        }
        return res;
    }

    private parseKey(key: Key): string {
        switch (key.type) {
            case'array':
                return `[${key}]`;
            case 'object':
                return `.${key}`;
        }
    }

    private parsePrimitive(data: string): void {
        switch (data) {
            case 'int':
                this.print(`BSON_APPEND_INT32(${this.parsedDepth}, "${this.currentKey}", data${this.parsedKeys});`);
                break;
            case 'long':
                this.print(`BSON_APPEND_INT64(${this.parsedDepth}, "${this.currentKey}", data${this.parsedKeys});`);
                break;
            case 'double':
                this.print(`BSON_APPEND_DOUBLE(${this.parsedDepth}, "${this.currentKey}", data${this.parsedKeys});`);
                break;
            case 'char*':
                this.print(`BSON_APPEND_UTF8(${this.parsedDepth}, "${this.currentKey}", data${this.parsedKeys});`);
                break;
        }
    }

    private parseObject(data: any): void {
        let oldDepth: string, newDepth: string;
        oldDepth = this.parsedDepth;
        this.depth++;
        newDepth = this.parsedDepth;

        this.print(`BSON_APPEND_DOCUMENT_BEGIN(${oldDepth}, "${this.currentKey}", ${newDepth});`);

        for (const key in data) {
            this.keys.push({ type: 'object', key });
            this.parse(data[key]);
            this.keys.pop();
        }

        this.print(`bson_append_document_end(${oldDepth}, ${newDepth});`);
        this.print(`bson_destroy(${newDepth});`);

        this.depth--;

    }

    private parseArray(data: any[]): void {
        let oldDepth: string, newDepth: string;
        oldDepth = this.parsedDepth;
        this.depth++;
        newDepth = this.parsedDepth;
        const counter = this.parsedForDepth;
        this.forDepth++;

        this.print(`BSON_APPEND_ARRAY_BEGIN(${oldDepth}, "${this.currentKey}", ${newDepth});`);
        this.print(`for (int ${counter} = 0; ${counter} < (data${this.parsedKeys}_count); ${counter}++)`);
        this.print(`{`);

        this.indentation++;
        this.keys.push({ key: counter, type: 'array' });
        this.parse(data[0]);
        this.keys.pop();
        this.indentation--;

        this.print(`}`);
        this.print(`bson_append_array_end(${oldDepth}, ${newDepth});`);
        this.print(`bson_destroy(${newDepth});`);

        this.depth--;
        this.forDepth--;
    }

    private parse(data: any): void {
        if (Array.isArray(data)) {
            this.parseArray(data);
        }
        else if (typeof data === 'object') {
            this.parseObject(data);
        }
        else {
            this.parsePrimitive(data);
        }
    }

    private firstParse(data: any): void {
        for (const key in data) {
            this.keys.push({ key, type: 'object' });
            this.parse(data[key]);
            this.keys.pop();
        }
    }

    protected comment = '{{GENERATE_BSON}}';
    protected generate(): void {
        this.print(`*bson_document = bson_new();`);
        this.print(`bson_t *children = (bson_t*)malloc(sizeof(bson_t) * ${this.maxDepth});`);
        this.firstParse(this.structure);
    }

    constructor(structure: any) {
        super(structure);
        this.generate();
    }

}

export { BsonGenerator as generator };