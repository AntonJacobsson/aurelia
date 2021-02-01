import { EOL } from 'os';
import { resolve } from 'path';
const space = ' ';
export class HttpServerOptions {
    constructor(root = './public/', hostName = '0.0.0.0', port = 8080, useHttp2 = false, useHttps = false, key = undefined, cert = undefined, logLevel = 'info', responseCacheControl = 'max-age=3600') {
        this.root = root;
        this.hostName = hostName;
        this.port = port;
        this.useHttp2 = useHttp2;
        this.useHttps = useHttps;
        this.key = key;
        this.cert = cert;
        this.logLevel = logLevel;
        this.responseCacheControl = responseCacheControl;
    }
    applyConfig(config) {
        // non-nested object-tree is expected.
        for (const [key, value] of Object.entries(config)) {
            this[key] = value;
        }
    }
    /** @internal */
    validate() {
        const useHttp2 = this.useHttp2;
        const useHttps = this.useHttps;
        const key = this.key;
        const cert = this.cert;
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if ((useHttp2 || useHttps) && !(key && cert)) { // boolean coercion is needed
            throw new Error(`key and cert are required for a HTTP/2 server`);
        }
    }
    toString(indent = '') {
        const l2Indent = `${indent}${space.repeat(2)}`;
        return `${indent}root${EOL}`
            + `${l2Indent}Description: The HTTP or HTTP/2 server serves the files from this directory${EOL}`
            + `${l2Indent}Value: ${this.root}${EOL}`
            + `${indent}hostName${EOL}`
            + `${l2Indent}Description: The host-name to be used${EOL}`
            + `${l2Indent}Value: ${this.hostName}${EOL}`
            + `${indent}port${EOL}`
            + `${l2Indent}Description: The port to be used${EOL}`
            + `${l2Indent}Value: ${this.port}${EOL}`
            + `${indent}useHttp2${EOL}`
            + `${l2Indent}Description: Whether to use HTTP/2 or not${EOL}`
            + `${l2Indent}Value: ${this.useHttp2}${EOL}`
            + `${indent}useHttps${EOL}`
            + `${l2Indent}Description: Whether to use SSL or not${EOL}`
            + `${l2Indent}Value: ${this.useHttps}${EOL}`
            + `${indent}key${EOL}`
            + `${l2Indent}Description: Optional path to the key file; required for https:// and HTTP/2${EOL}`
            + `${l2Indent}Value: ${this.key}${EOL}`
            + `${indent}cert${EOL}`
            + `${l2Indent}Description: Optional path to the certificate file; required for https:// and HTTP/2${EOL}`
            + `${l2Indent}Value: ${this.cert}${EOL}`
            + `${indent}logLevel${EOL}`
            + `${l2Indent}Description: Log level used by the HTTP server${EOL}`
            + `${l2Indent}Value: ${this.logLevel}${EOL}`;
    }
    get level() {
        const logLevel = this.logLevel;
        if (typeof logLevel === 'number') {
            return logLevel;
        }
        switch (logLevel) {
            case 'trace': return 0 /* trace */;
            case 'debug': return 1 /* debug */;
            case 'info': return 2 /* info */;
            case 'warn': return 3 /* warn */;
            case 'error': return 4 /* error */;
            case 'fatal': return 5 /* fatal */;
            case 'none': return 6 /* none */;
        }
    }
    applyOptionsFromCli(cwd, args, argPrefix = '') {
        const unconsumedArgs = [];
        while (args.length > 0) {
            const key = args[0].trim().replace(/-/g, '');
            const value = args[1];
            switch (key) {
                case `${argPrefix}root`:
                    this.root = resolve(cwd, value);
                    break;
                case `${argPrefix}hostName`:
                    this.hostName = value;
                    break;
                case `${argPrefix}port`:
                    this.port = Number(value);
                    break;
                case `${argPrefix}key`:
                    this.key = resolve(cwd, value);
                    break;
                case `${argPrefix}cert`:
                    this.cert = resolve(cwd, value);
                    break;
                case `${argPrefix}useHttp2`:
                    this.useHttp2 = value === 'true';
                    break;
                case `${argPrefix}logLevel`:
                    this.logLevel = value;
                    break;
                case `${argPrefix}responseCacheControl`:
                    this.responseCacheControl = value;
                    break;
                default:
                    unconsumedArgs.push(key, value);
                    break;
            }
            args.splice(0, 2);
        }
        if (unconsumedArgs.length > 0) {
            console.warn(`Following arguments are not consumed ${unconsumedArgs.join(',')}`);
        }
    }
}
//# sourceMappingURL=server-options.js.map