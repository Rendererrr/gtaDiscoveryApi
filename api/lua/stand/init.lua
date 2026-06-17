-- Stand compatibility layer — entry point. Creates the shared dialect tables + constants, then pulls
-- in the rest of the layer in load order via __api_load (injected by lua_engine::load_api_scripts).
-- Returns the layer descriptor { name, globals }. Loaded after the C++ Stand primitives (menu.*,
-- memory, native_invoker, async_http, __stand_*) and engine tables (script, notify, ctx) exist.

-- ===== tables =====
util         = util or {}
lang         = lang or {}
filesystem   = filesystem or {}
async_http   = async_http or {}
entities     = entities or {}
players      = players or {}
v3           = v3 or {}

-- ===== constants (best-effort; ignored by our builders but referenced by scripts) =====
COMMANDPERM_USERONLY=0; COMMANDPERM_FRIENDLY=1; COMMANDPERM_NEUTRAL=2; COMMANDPERM_SPAWN=3
COMMANDPERM_RUDE=4; COMMANDPERM_AGGRESSIVE=5; COMMANDPERM_TOXIC=6
CLICK_MENU=0; CLICK_COMMAND=1; CLICK_HOTKEY=2; CLICK_AUTO=4; CLICK_SCRIPTED=8
TOAST_DEFAULT=0; TOAST_ALL=0; TOAST_ABOVE_MAP=0; TOAST_CONSOLE=0; TOAST_LOGGER=0
TOAST_CHAT=0; TOAST_CHAT_TEAM=0; TOAST_FILE=0; TOAST_WEB=0   -- we don't differentiate toast channels
INVALID_GUID = 0   -- entity handle sentinel (GET_VEHICLE_PED_IS_IN returns 0 when on foot)
-- CLICK_* extras (we interpret clicks ourselves; values are best-effort bit-flags, consistent w/ above)
CLICK_BULK=16; CLICK_FLAG_AUTO=4; CLICK_FLAG_CHAT=16; CLICK_FLAG_WEB=32
CLICK_CHAT_ALL=128; CLICK_CHAT_TEAM=256; CLICK_WEB=512; CLICK_WEB_COMMAND=1024
-- ALIGN_* (text/draw alignment; reading order TL..BR — draws are best-effort so exact parity not required)
ALIGN_TOP_LEFT=1;    ALIGN_TOP_CENTRE=2;    ALIGN_TOP_RIGHT=3
ALIGN_CENTRE_LEFT=4; ALIGN_CENTRE=5;        ALIGN_CENTRE_RIGHT=6
ALIGN_BOTTOM_LEFT=7; ALIGN_BOTTOM_CENTRE=8; ALIGN_BOTTOM_RIGHT=9
-- COMMAND_* type ids (we build menus ourselves; ids are internal, only used for menu.get_type comparisons)
COMMAND_ACTION=0; COMMAND_TOGGLE=1; COMMAND_SLIDER=2; COMMAND_SLIDER_FLOAT=3
COMMAND_LIST=4; COMMAND_LIST_ACTION=5; COMMAND_LIST_SELECT=6; COMMAND_INPUT=7
COMMAND_TEXTSLIDER=8; COMMAND_TEXTSLIDER_STATEFUL=9; COMMAND_DIVIDER=10; COMMAND_READONLY=11
-- COMMAND_FLAG_* (passed to command creation; we ignore but scripts reference COMMAND_FLAG_LIST)
COMMAND_FLAG_LIST=1; COMMAND_FLAG_ALLOW_TOGGLE=2; COMMAND_FLAG_DEFAULT_TO_ON=4
-- LISTINDICATOR_* (set_indicator_type is a no-op for us)
LISTINDICATOR_OFF=0; LISTINDICATOR_ON=1; LISTINDICATOR_ARROW=2; LISTINDICATOR_ARROW_IF_CHILDREN=3
GLOBAL_TUNABLE_BASE=0          -- script-global tunable base (tunables are stubbed)
LATEST_NATIVES_VERSION=0       -- best-effort; scripts that version-gate natives treat 0 as "unknown"
function pluto_use(...) end   -- Pluto `pluto_use "x.y.z"` version pragma — no-op for us

-- ===== load the rest of the layer (order matters: util defines __stand_iter/scheduler/__model_done,
-- players defines __entity_coords used by entities) =====
__api_load("util.lua")
__api_load("menu.lua")
__api_load("lang.lua")
__api_load("filesystem.lua")
__api_load("v3.lua")
__api_load("players.lua")
__api_load("entities.lua")
__api_load("draw_debug_text.lua")   -- registers the util.draw_debug_text overlay (Stand-dialect visual)

return { name = "stand", globals = {
    menu = menu, util = util, players = players, entities = entities,
    v3 = v3, lang = lang, filesystem = filesystem, async_http = async_http,
} }
