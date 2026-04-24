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
var express_1 = require("express");
var cors_1 = require("cors");
var path_1 = require("path");
var dotenv_1 = require("dotenv");
var caspar_client_1 = require("./caspar-client");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
var app = (0, express_1.default)();
var PORT = 3030;
var MAIN_APP_URL = process.env.MAIN_APP_URL || 'http://192.168.1.126:3000';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ─── CasparCG Status & Control ─────────────────────────────
app.get('/api/status', function (req, res) {
    res.json({
        connected: caspar_client_1.default.isConnected(),
        host: caspar_client_1.default.getHost(),
    });
});
app.post('/api/connect', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var host, port, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                host = req.body.host || process.env.CASPAR_HOST || '192.168.1.232';
                port = req.body.port || Number(process.env.CASPAR_PORT) || 5250;
                return [4 /*yield*/, caspar_client_1.default.connect(host, port)];
            case 1:
                _a.sent();
                res.json({ ok: true, host: "".concat(host, ":").concat(port) });
                return [3 /*break*/, 3];
            case 2:
                e_1 = _a.sent();
                res.status(500).json({ ok: false, error: e_1.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/disconnect', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, caspar_client_1.default.disconnect()];
            case 1:
                _a.sent();
                res.json({ ok: true });
                return [3 /*break*/, 3];
            case 2:
                e_2 = _a.sent();
                res.status(500).json({ ok: false, error: e_2.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/play', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, channel, layer, file, loop, result_1, result, e_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                _a = req.body, channel = _a.channel, layer = _a.layer, file = _a.file, loop = _a.loop;
                if (!loop) return [3 /*break*/, 2];
                return [4 /*yield*/, caspar_client_1.default.playLoop(channel, layer, file)];
            case 1:
                result_1 = _b.sent();
                return [2 /*return*/, res.json({ ok: true, result: result_1 })];
            case 2: return [4 /*yield*/, caspar_client_1.default.play(channel, layer, file)];
            case 3:
                result = _b.sent();
                res.json({ ok: true, result: result });
                return [3 /*break*/, 5];
            case 4:
                e_3 = _b.sent();
                res.status(500).json({ ok: false, error: e_3.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.post('/api/stop', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, channel, layer, result, e_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, channel = _a.channel, layer = _a.layer;
                return [4 /*yield*/, caspar_client_1.default.stop(channel, layer)];
            case 1:
                result = _b.sent();
                res.json({ ok: true, result: result });
                return [3 /*break*/, 3];
            case 2:
                e_4 = _b.sent();
                res.status(500).json({ ok: false, error: e_4.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/pause', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, channel, layer, result, e_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, channel = _a.channel, layer = _a.layer;
                return [4 /*yield*/, caspar_client_1.default.pause(channel, layer)];
            case 1:
                result = _b.sent();
                res.json({ ok: true, result: result });
                return [3 /*break*/, 3];
            case 2:
                e_5 = _b.sent();
                res.status(500).json({ ok: false, error: e_5.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/resume', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, channel, layer, result, e_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, channel = _a.channel, layer = _a.layer;
                return [4 /*yield*/, caspar_client_1.default.resume(channel, layer)];
            case 1:
                result = _b.sent();
                res.json({ ok: true, result: result });
                return [3 /*break*/, 3];
            case 2:
                e_6 = _b.sent();
                res.status(500).json({ ok: false, error: e_6.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/clear', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, channel, layer, result, e_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, channel = _a.channel, layer = _a.layer;
                return [4 /*yield*/, caspar_client_1.default.clear(channel, layer)];
            case 1:
                result = _b.sent();
                res.json({ ok: true, result: result });
                return [3 /*break*/, 3];
            case 2:
                e_7 = _b.sent();
                res.status(500).json({ ok: false, error: e_7.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/api/load', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, channel, layer, file, result, e_8;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, channel = _a.channel, layer = _a.layer, file = _a.file;
                return [4 /*yield*/, caspar_client_1.default.loadBG(channel, layer, file)];
            case 1:
                result = _b.sent();
                res.json({ ok: true, result: result });
                return [3 /*break*/, 3];
            case 2:
                e_8 = _b.sent();
                res.status(500).json({ ok: false, error: e_8.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/api/info/:channel/:layer', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var ch, layer, raw, parsed, e_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                ch = parseInt(req.params.channel);
                layer = parseInt(req.params.layer);
                return [4 /*yield*/, caspar_client_1.default.info(ch, layer)];
            case 1:
                raw = _a.sent();
                parsed = caspar_client_1.default.parseInfoToChannelInfo(raw, ch, layer);
                res.json(parsed);
                return [3 /*break*/, 3];
            case 2:
                e_9 = _a.sent();
                res.status(500).json({ error: e_9.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/api/media', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var raw, parsed, e_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, caspar_client_1.default.listMedia()];
            case 1:
                raw = _a.sent();
                parsed = caspar_client_1.default.parseMediaList(raw);
                res.json({ files: parsed });
                return [3 /*break*/, 3];
            case 2:
                e_10 = _a.sent();
                res.status(500).json({ error: e_10.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ─── Proxy Routes to Main App (port 3000) ──────────────────
// Get list of available rundowns
app.get('/api/rundowns/live', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var url, rundownId, response, data, e_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                url = new URL('/api/rundowns/live', MAIN_APP_URL);
                rundownId = req.query.rundownId;
                if (rundownId) {
                    url.searchParams.set('rundownId', rundownId);
                }
                return [4 /*yield*/, fetch(url.toString())];
            case 1:
                response = _a.sent();
                if (!response.ok) {
                    throw new Error("Main app returned ".concat(response.status));
                }
                return [4 /*yield*/, response.json()];
            case 2:
                data = _a.sent();
                res.json(data);
                return [3 /*break*/, 4];
            case 3:
                e_11 = _a.sent();
                console.error('[Proxy] Failed to fetch rundowns from main app:', e_11.message);
                res.status(502).json({
                    error: 'Cannot reach main app',
                    detail: e_11.message,
                    mainAppUrl: MAIN_APP_URL,
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ─── Static Files (Production Build) ───────────────────────
app.use(express_1.default.static(path_1.default.join(__dirname, 'dist/client')));
app.get('*', function (req, res) {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path_1.default.join(__dirname, 'dist/client', 'index.html'));
    }
});
// ─── Start Server ───────────────────────────────────────────
app.listen(PORT, '0.0.0.0', function () {
    console.log("\n\uD83C\uDFAC News Forge Playout Server running on http://0.0.0.0:".concat(PORT));
    console.log("\uD83D\uDCE1 Main app proxy target: ".concat(MAIN_APP_URL));
    console.log("\uD83C\uDFA5 CasparCG target: ".concat(process.env.CASPAR_HOST || '192.168.1.232', ":").concat(process.env.CASPAR_PORT || 5250, "\n"));
});
