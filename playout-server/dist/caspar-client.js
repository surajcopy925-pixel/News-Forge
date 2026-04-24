"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.casparClient = void 0;
var net_1 = require("net");
var CasparClient = /** @class */ (function () {
    function CasparClient() {
        this.socket = null;
        this._connected = false;
        this.responseBuffer = '';
        this.pendingResolve = null;
        this.reconnectTimer = null;
        this.host = process.env.CASPAR_HOST || '192.168.1.232';
        this.port = parseInt(process.env.CASPAR_PORT || '5250', 10);
    }
    CasparClient.prototype.isConnected = function () {
        return this._connected;
    };
    CasparClient.prototype.getHost = function () {
        return "".concat(this.host, ":").concat(this.port);
    };
    CasparClient.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (this._connected && this.socket) {
                    return [2 /*return*/, { code: 200, message: "Already connected to ".concat(this.host, ":").concat(this.port) }];
                }
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.socket = new net_1.default.Socket();
                        _this.socket.setTimeout(5000);
                        _this.socket.connect(_this.port, _this.host, function () {
                            _this._connected = true;
                            console.log("[CasparCG] Connected to ".concat(_this.host, ":").concat(_this.port));
                            resolve({ code: 200, message: "Connected to ".concat(_this.host, ":").concat(_this.port) });
                        });
                        _this.socket.on('data', function (data) {
                            _this.responseBuffer += data.toString();
                            _this.processBuffer();
                        });
                        _this.socket.on('close', function () {
                            console.log('[CasparCG] Connection closed');
                            _this._connected = false;
                            _this.socket = null;
                        });
                        _this.socket.on('error', function (err) {
                            console.error('[CasparCG] Socket error:', err.message);
                            _this._connected = false;
                            _this.socket = null;
                            reject({ code: 500, message: err.message });
                        });
                        _this.socket.on('timeout', function () {
                            var _a;
                            console.error('[CasparCG] Connection timeout');
                            (_a = _this.socket) === null || _a === void 0 ? void 0 : _a.destroy();
                            reject({ code: 408, message: 'Connection timeout' });
                        });
                    })];
            });
        });
    };
    CasparClient.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.socket) {
                    this.socket.destroy();
                    this.socket = null;
                }
                this._connected = false;
                return [2 /*return*/, { code: 200, message: 'Disconnected' }];
            });
        });
    };
    CasparClient.prototype.processBuffer = function () {
        var lines = this.responseBuffer.split('\r\n');
        for (var i = 0; i < lines.length - 1; i++) {
            var line = lines[i];
            if (/^\d{3}\s/.test(line)) {
                var code = parseInt(line.substring(0, 3), 10);
                var message = line.substring(4);
                // Multi-line responses (2xx with data following)
                if (code >= 200 && code < 300 && lines[i + 1] && !/^\d{3}\s/.test(lines[i + 1])) {
                    var dataLines = [];
                    var j = i + 1;
                    while (j < lines.length - 1 && !/^\d{3}\s/.test(lines[j])) {
                        dataLines.push(lines[j]);
                        j++;
                    }
                    if (this.pendingResolve) {
                        this.pendingResolve({ code: code, message: message, data: dataLines.join('\n') });
                        this.pendingResolve = null;
                    }
                    i = j - 1;
                }
                else {
                    if (this.pendingResolve) {
                        this.pendingResolve({ code: code, message: message });
                        this.pendingResolve = null;
                    }
                }
            }
        }
        // Keep the last incomplete line in buffer
        this.responseBuffer = lines[lines.length - 1];
    };
    CasparClient.prototype.send = function (command) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (!this._connected || !this.socket) {
                    throw new Error('Not connected to CasparCG');
                }
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.pendingResolve = resolve;
                        setTimeout(function () {
                            if (_this.pendingResolve === resolve) {
                                _this.pendingResolve = null;
                                resolve({ code: 408, message: 'Command timeout' });
                            }
                        }, 5000);
                        _this.socket.write(command + '\r\n', function (err) {
                            if (err) {
                                _this.pendingResolve = null;
                                reject({ code: 500, message: err.message });
                            }
                        });
                        console.log("[CasparCG] >> ".concat(command));
                    })];
            });
        });
    };
    // ── Transport Commands ──────────────────────────────────
    CasparClient.prototype.play = function (channel, layer, clip) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.send("PLAY ".concat(channel, "-").concat(layer, " \"").concat(clip, "\""))];
            });
        });
    };
    CasparClient.prototype.playLoop = function (channel, layer, clip) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.send("PLAY ".concat(channel, "-").concat(layer, " \"").concat(clip, "\" LOOP"))];
            });
        });
    };
    CasparClient.prototype.playAuto = function (channel, layer) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.send("PLAY ".concat(channel, "-").concat(layer))];
            });
        });
    };
    CasparClient.prototype.stop = function (channel, layer) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.send("STOP ".concat(channel, "-").concat(layer))];
            });
        });
    };
    CasparClient.prototype.pause = function (channel, layer) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.send("PAUSE ".concat(channel, "-").concat(layer))];
            });
        });
    };
    CasparClient.prototype.resume = function (channel, layer) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.send("RESUME ".concat(channel, "-").concat(layer))];
            });
        });
    };
    CasparClient.prototype.clear = function (channel, layer) {
        return __awaiter(this, void 0, void 0, function () {
            var target;
            return __generator(this, function (_a) {
                target = layer ? "".concat(channel, "-").concat(layer) : "".concat(channel);
                return [2 /*return*/, this.send("CLEAR ".concat(target))];
            });
        });
    };
    CasparClient.prototype.loadBG = function (channel_1, layer_1, clip_1) {
        return __awaiter(this, arguments, void 0, function (channel, layer, clip, auto) {
            var autoFlag;
            if (auto === void 0) { auto = false; }
            return __generator(this, function (_a) {
                autoFlag = auto ? ' AUTO' : '';
                return [2 /*return*/, this.send("LOADBG ".concat(channel, "-").concat(layer, " \"").concat(clip, "\"").concat(autoFlag))];
            });
        });
    };
    CasparClient.prototype.load = function (channel, layer, clip) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.send("LOAD ".concat(channel, "-").concat(layer, " \"").concat(clip, "\""))];
            });
        });
    };
    // ── Query Commands ──────────────────────────────────────
    CasparClient.prototype.info = function (channel, layer) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.send("INFO ".concat(channel, "-").concat(layer))];
            });
        });
    };
    CasparClient.prototype.listMedia = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.send('CLS')];
            });
        });
    };
    CasparClient.prototype.version = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.send('VERSION')];
            });
        });
    };
    // ── Parse Helpers ───────────────────────────────────────
    CasparClient.prototype.parseInfoToChannelInfo = function (data) {
        var defaults = {
            playing: false,
            paused: false,
            foreground: '',
            background: '',
            loop: false,
            clipName: '',
            totalFrames: 0,
            currentFrame: 0,
            fps: 25,
            timecode: '00:00:00:00',
        };
        if (!data)
            return defaults;
        try {
            var playing = data.includes('<status>playing</status>');
            var paused = data.includes('<status>paused</status>');
            var fgMatch = data.match(/<foreground>[\s\S]*?<filename>(.*?)<\/filename>[\s\S]*?<\/foreground>/);
            var bgMatch = data.match(/<background>[\s\S]*?<filename>(.*?)<\/filename>[\s\S]*?<\/background>/);
            var loopMatch = data.match(/<loop>(true|false)<\/loop>/);
            var frameMatch = data.match(/<frame>(\d+)<\/frame>/);
            var totalMatch = data.match(/<nb-frames>(\d+)<\/nb-frames>/);
            var fpsMatch = data.match(/<framerate>(\d+)<\/framerate>/);
            var clipName = (fgMatch === null || fgMatch === void 0 ? void 0 : fgMatch[1]) || '';
            var currentFrame = parseInt((frameMatch === null || frameMatch === void 0 ? void 0 : frameMatch[1]) || '0', 10);
            var totalFrames = parseInt((totalMatch === null || totalMatch === void 0 ? void 0 : totalMatch[1]) || '0', 10);
            var fps = parseInt((fpsMatch === null || fpsMatch === void 0 ? void 0 : fpsMatch[1]) || '25', 10);
            var totalSeconds = fps > 0 ? Math.floor(currentFrame / fps) : 0;
            var h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            var m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            var s = String(totalSeconds % 60).padStart(2, '0');
            var f = String(currentFrame % fps).padStart(2, '0');
            return {
                playing: playing,
                paused: paused,
                foreground: (fgMatch === null || fgMatch === void 0 ? void 0 : fgMatch[1]) || '',
                background: (bgMatch === null || bgMatch === void 0 ? void 0 : bgMatch[1]) || '',
                loop: (loopMatch === null || loopMatch === void 0 ? void 0 : loopMatch[1]) === 'true',
                clipName: clipName,
                totalFrames: totalFrames,
                currentFrame: currentFrame,
                fps: fps,
                timecode: "".concat(h, ":").concat(m, ":").concat(s, ":").concat(f),
            };
        }
        catch (_a) {
            return defaults;
        }
    };
    CasparClient.prototype.parseMediaList = function (data) {
        if (!data)
            return [];
        var lines = data.split('\n').filter(function (l) { return l.trim(); });
        return lines.map(function (line) {
            var _a;
            var parts = line.trim().split(/\s+/);
            var name = ((_a = parts[0]) === null || _a === void 0 ? void 0 : _a.replace(/^"|"$/g, '')) || '';
            var type = parts[1] || 'MOVIE';
            var duration = parts[2] || '00:00:00:00';
            return { name: name, type: type, duration: duration };
        });
    };
    return CasparClient;
}());
exports.casparClient = new CasparClient();
exports.default = exports.casparClient;
