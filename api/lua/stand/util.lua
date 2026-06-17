local nv = native_invoker

-- ===== util: time / log / toast =====
function util.current_time_millis() return math.floor((ctx.time() or 0) * 1000) end
function util.current_unix_time_seconds() return os.time() end
util.log = util.log or print
function util.toast(msg, flags) notify.push("", tostring(msg), 4, 4.0) end
-- Debug overlay: util.draw_debug_text(text) (script thread) stacks lines; an overlay (render thread)
-- draws them top-left. Double-buffered Lua tables, safe because all Lua runs under one lock; the
-- scheduler flips back->front each tick (see below).
__draw_debug_back = __draw_debug_back or {}
__draw_debug_front = __draw_debug_front or {}
function util.draw_debug_text(text) __draw_debug_back[#__draw_debug_back + 1] = tostring(text) end
function util.show_corner_help(...) end
function util.replace_corner_help(...) end

-- ===== util: JOAAT (matches game hash) =====
function util.joaat(s)
    s = string.lower(tostring(s))
    local h = 0
    for i = 1, #s do
        h = (h + string.byte(s, i)) & 0xFFFFFFFF
        h = (h + (h << 10)) & 0xFFFFFFFF
        h = (h ~ (h >> 6)) & 0xFFFFFFFF
    end
    h = (h + (h << 3)) & 0xFFFFFFFF
    h = (h ~ (h >> 11)) & 0xFFFFFFFF
    h = (h + (h << 15)) & 0xFFFFFFFF
    return h
end
util.ujoaat = util.joaat

-- memory.tunable_offset(name_or_hash) / memory.tunable(name_or_hash) are provided in C++ (stand_memory),
-- backed by the stand_tunables cacher (hooks the tunables-registration natives, runs tuneables_processing
-- once, maps tunable-hash -> Global_262145 offset, caches to disk). Fallback stubs only if absent.
if memory and not memory.tunable_offset then
    function memory.tunable_offset(x) return 0 end
end
if memory and not memory.tunable then
    function memory.tunable(x) return 0 end
end

-- Load a bundled natives library. __stand_dofile (C++) reads + Pluto-translates + runs the source on
-- the current VM. flavour "g"/"g-uno"/"uno" = flat globals (WAIT, IS_CONTROL_JUST_RELEASED, ...);
-- no flavour = namespace tables (SYSTEM.WAIT, PED.*, ...). Stand ships libs in three layouts; try them
-- in order and load the first that exists:
--   1. lib/natives-<ver>/<flavour|init>.source.lua   (Dolos: g.source.lua)
--   2. lib/natives-<ver>/<flavour|init>.lua          (Heist Control: init.lua)
--   3. lib/natives-<ver>.lua                         (Ryze: flat namespace file)
function util.require_natives(version, flavour)
    local ver = tostring(version)
    if not flavour then
        local d = ver:find("%.")
        if d then flavour = ver:sub(d + 1); ver = ver:sub(1, d - 1) end
    end
    local leaf = flavour or "init"
    local dir = __stand_script_dir or ""
    local candidates = {
        dir .. "lib/natives-" .. ver .. "/" .. leaf .. ".source.lua",
        dir .. "lib/natives-" .. ver .. "/" .. leaf .. ".lua",
        dir .. "lib/natives-" .. ver .. ".lua",
    }
    for _, file in ipairs(candidates) do
        if filesystem.exists(file) then
            if __stand_dofile and __stand_dofile(file) then return end
        end
    end
    util.toast("require_natives failed: natives-" .. ver .. (flavour and (" (" .. flavour .. ")") or ""))
end

-- ===== Pluto string-library extensions (methods Stand scripts call as s:method(...)) =====
function string.startswith(s, p) return string.sub(s, 1, #p) == p end
function string.endswith(s, p) return p == "" or string.sub(s, -#p) == p end
function string.contains(s, sub) return string.find(s, sub, 1, true) ~= nil end
function string.lstrip(s) return (string.gsub(s, "^%s+", "")) end
function string.rstrip(s) return (string.gsub(s, "%s+$", "")) end
function string.strip(s) return (string.gsub(string.gsub(s, "^%s+", ""), "%s+$", "")) end
string.trim = string.strip
function string.split(s, sep)
    local out = {}
    sep = sep or "%s"
    for part in string.gmatch(s, "([^" .. sep .. "]+)") do out[#out + 1] = part end
    return out
end

-- ===== Pluto table-library extensions =====
function table.contains(t, val)
    for _, v in pairs(t) do if v == val then return true end end
    return false
end
function table.find(t, val)
    for k, v in pairs(t) do if v == val then return k end end
    return nil
end

-- ===== Pluto direct table-for support (used by the loader's source transform) =====
-- `for k,v in <exp> do` becomes `for k,v in __stand_iter(<exp>) do`. A lone table iterates like pairs;
-- anything else (pairs/ipairs/next/gmatch/io.lines/custom iterators) passes straight through.
function __stand_iter(...)
    if select("#", ...) == 1 and type((...)) == "table" then
        return pairs((...))
    end
    return ...
end

-- ===== threading (Stand veneer over the FOUNDATION scheduler in api\thread.lua) =====
-- One scheduler now resumes every coroutine (Stand's + native scripts'). Stand's thread helpers delegate
-- to thread.* but keep Stand's __stand_guarded wrapper (traceback + the __stand_stop__ sentinel filter).
function __stand_is_stop(err)
    return type(err) == "string" and string.find(err, "__stand_stop__", 1, true) ~= nil
end
-- Run a thread/body function, reporting any error WITH a Lua traceback. xpcall is yieldable in 5.4, so
-- util.yield() inside f still works; __stand_stop__ errors are swallowed (the script's own stop signal).
function __stand_guarded(f, ...)
    local ok, err = xpcall(f, debug.traceback, ...)
    if not ok and not __stand_is_stop(err) then
        print("[stand] thread error: " .. tostring(err))
        if notify then notify.push("Stand Script", tostring(err), 2, 6.0) end
    end
end
function util.create_thread(f, ...)
    local args = table.pack(...)
    local co = coroutine.create(function() __stand_guarded(f, table.unpack(args, 1, args.n)) end)
    thread.adopt(co)
    return co
end
function util.yield(ms) return thread.yield(ms) end
util.yield_once = util.yield
os.sleep = util.yield
-- Thread management — delegate to the foundation scheduler.
function util.shoot_thread(co) thread.stop(co) end
function util.is_scheduled_in(co) return thread.scheduled(co) end
function util.stop_thread() thread.stop(coroutine.running()); thread.yield() end
function util.get_thread_count() return thread.count() end
function util.stop_all_threads() thread.clear() end
function util.try_run(f, ...)
    local args = table.pack(...)
    return xpcall(function() return f(table.unpack(args, 1, args.n)) end, debug.traceback)
end
function util.create_tick_handler(f, ...)
    local args = table.pack(...)
    return util.create_thread(function()
        while f(table.unpack(args, 1, args.n)) ~= false do util.yield() end
    end)
end
function util.keep_running() end                  -- our scripts persist; no blocking needed
function util.on_stop(f) end
function util.on_pre_stop(f) end
function util.can_continue() return true end

-- Run a Stand script body as a coroutine so it may util.yield() from the top level. Runs the first slice
-- now (builds the initial menu up to the first yield), then hands the rest to the foundation scheduler.
-- Called by stand_loader::load_script on the script thread.
function __stand_run_body(fn)
    local co = coroutine.create(function() __stand_guarded(fn) end)
    coroutine.resume(co)   -- first slice (errors reported with traceback inside __stand_guarded)
    if coroutine.status(co) ~= "dead" then thread.adopt(co) end
end

-- Stand side-tick: deliver finished async_http responses + publish the debug-text overlay lines. The
-- coroutine resume loop lives once in the foundation scheduler (api\thread.lua), NOT here.
script.on_tick(function()
    if __stand_http_pump then __stand_http_pump() end   -- deliver finished async_http responses
    __draw_debug_front = __draw_debug_back                -- publish last tick's debug lines; start fresh
    __draw_debug_back = {}
end)

-- ===== util: session / world (native-backed, script-thread only) =====
local function nat0_bool(hash) nv.begin_call(); nv.end_call(hash); return nv.get_return_value_bool() end
function util.is_session_started() return nat0_bool("CA97246103B63917") end   -- NETWORK_IS_SESSION_STARTED
function util.is_session_transition_active() return false end

-- Read an int stat by name into a reusable buffer (STAT_GET_INT, script-thread only).
local __stat_buf
local function __stat_get_int(name)
    if not __stat_buf then __stat_buf = memory.alloc(8) end
    nv.begin_call()
    nv.push_arg_int(util.joaat(name))
    nv.push_arg_pointer(__stat_buf)
    nv.push_arg_int(-1)
    nv.end_call("767FBC2AC802EF3D")   -- STAT_GET_INT
    return memory.read_int(__stat_buf)
end
util.stat_get_int = __stat_get_int

-- Write an int stat by name (STAT_SET_INT, script-thread only). Returns success bool.
function util.stat_set_int(name, value)
    nv.begin_call()
    nv.push_arg_int(util.joaat(name))
    nv.push_arg_int(value)
    nv.push_arg_bool(true)            -- save
    nv.end_call("B3271D7AB655B441")   -- STAT_SET_INT
    return nv.get_return_value_bool()
end

-- Active MP character slot (0 or 1) from MPPLY_LAST_MP_CHAR; reused buffer so the per-tick callers
-- in real scripts don't leak.
function util.get_char_slot()
    local s = __stat_get_int("MPPLY_LAST_MP_CHAR")
    return (s == 1) and 1 or 0
end
-- GET_GROUND_Z_FOR_3D_COORD: returns (found, ground_z). Reused buffer; script-thread only.
local __gz_buf
function util.get_ground_z(x, y, z)
    if not __gz_buf then __gz_buf = memory.alloc(8) end
    nv.begin_call()
    nv.push_arg_float(x); nv.push_arg_float(y); nv.push_arg_float(z or 1000.0)
    nv.push_arg_pointer(__gz_buf); nv.push_arg_bool(false); nv.push_arg_bool(false)
    nv.end_call("C906A7DAB05C8D2B")
    return nv.get_return_value_bool(), memory.read_float(__gz_buf)
end

-- ===== util: native-backed wrappers (Batch 6; script-thread only) =====
util.stat_get_int64 = util.stat_get_int     -- int64 stats reuse the int path (best-effort; most fit in 32b)
util.stat_set_int64 = util.stat_set_int
function util.stat_get_type(name) return 0 end
-- DLC tunables: hashes unverified -> safe defaults (features that gate on these stay off, not crash).
function util.get_tunable_int(...) return 0 end
function util.get_tunable_bool(...) return false end
-- Model-class checks with no reliable native -> false (callers use them only to filter/classify).
function util.is_this_model_a_blimp(m) return false end
function util.is_this_model_a_submarine(m) return false end
function util.is_this_model_a_submarine_car(m) return false end
function util.is_this_model_a_trailer(m) return false end
function util.is_this_model_an_object(m) return false end
-- Frontend text command natives (help/feed/text) — UI affordances we don't host -> inert.
function util.BEGIN_TEXT_COMMAND_DISPLAY_HELP(...) end
function util.BEGIN_TEXT_COMMAND_DISPLAY_TEXT(...) end
function util.BEGIN_TEXT_COMMAND_THEFEED_POST(...) end
function util.BEGIN_TEXT_COMMAND_IS_THIS_HELP_MESSAGE_BEING_DISPLAYED(...) return false end
function util._BEGIN_TEXT_COMMAND_GET_WIDTH(...) return 0 end
function util._BEGIN_TEXT_COMMAND_LINE_COUNT(...) return 0 end
-- world->screen (no-adjustment variant) — same projection as cam.world_to_screen.
function util.get_screen_coord_from_world_coord_no_adjustment(pos) return cam.world_to_screen(pos) end
-- Particle fx asset (USE_PARTICLE_FX_ASSET).
function util.set_particle_fx_asset(name)
    nv.begin_call(); nv.push_arg_string(tostring(name or "")); nv.end_call("6C38AF3693A69A91")
end
-- teleport_2d(x, y): self to (x, y) at ground height (best-effort).
function util.teleport_2d(x, y)
    local _, gz = util.get_ground_z(x, y, 1000.0)
    player.teleport(x, y, (gz ~= 0) and gz or 0.0)
end


-- ===== util shims (features we don't host: identity / best-effort / no-op) =====
-- get_label_text(key): resolve known label keys (e.g. weapon WT_* -> readable name); else identity.
function util.get_label_text(label) return (__stand_label_map and __stand_label_map[label]) or tostring(label) end
function util.trigger_script_event(bitset, args) end
function util.on_transition_finished(cb) end       -- no session-transition event tracking
function util.on_pad_shake(cb) end
function util.call_foreign_function(...) return 0 end
function util.copy_to_clipboard(s) end
function util.get_clipboard_text() return "" end
function util.register_label(key, text) if lang and lang.set_translate then lang.set_translate(key, text) end end
local __blip_buf
function util.remove_blip(blip)
    if not blip or blip == 0 then return end
    if not __blip_buf then __blip_buf = memory.alloc(8) end
    memory.write_int(__blip_buf, blip)
    nv.begin_call(); nv.push_arg_pointer(__blip_buf); nv.end_call("86A652570E5F25DD")   -- REMOVE_BLIP(&blip)
end
function util.restart_script() if __stand_restart then __stand_restart() end end
function util.stop_script() end
function util.spoof_script(name, fn) if fn then return fn() end end
function util.request_script_host() end
function util.register_file(path) end
function util.open_folder(path) end
function util.is_interaction_menu_open() return false end
function util.get_rp_required_for_rank(rank) return 0 end
function util.arspinner_enable(...) end
function util.arspinner_disable(...) end
function util.draw_ar_beacon(...) end
function util.set_local_player_wanted_level(wl) players.set_wanted_level(players.user(), wl) end
-- World drawing (script-thread natives). draw_line/sphere/box (sphere via DRAW_MARKER type 28; box as a
-- wireframe AABB from its first two corner vectors). draw_sphere accepts (v3,radius,...) or (x,y,z,radius,...).
function util.draw_line(x1, y1, z1, x2, y2, z2, r, g, b, a)
    nv.begin_call()
    nv.push_arg_float(x1); nv.push_arg_float(y1); nv.push_arg_float(z1)
    nv.push_arg_float(x2); nv.push_arg_float(y2); nv.push_arg_float(z2)
    nv.push_arg_int(r or 255); nv.push_arg_int(g or 255); nv.push_arg_int(b or 255); nv.push_arg_int(a or 255)
    nv.end_call("6B7256074AE34680")   -- DRAW_LINE
end
function util.draw_sphere(a1, a2, a3, a4, a5, a6, a7, a8)
    local x, y, z, radius, r, g, b, al
    if type(a1) == "table" then x, y, z, radius, r, g, b, al = a1.x, a1.y, a1.z, a2, a3, a4, a5, a6
    else x, y, z, radius, r, g, b, al = a1, a2, a3, a4, a5, a6, a7, a8 end
    local d = (radius or 1.0) * 2.0
    nv.begin_call()
    nv.push_arg_int(28)                                                   -- marker type 28 = sphere
    nv.push_arg_float(x); nv.push_arg_float(y); nv.push_arg_float(z)
    nv.push_arg_float(0); nv.push_arg_float(0); nv.push_arg_float(0)
    nv.push_arg_float(0); nv.push_arg_float(0); nv.push_arg_float(0)
    nv.push_arg_float(d); nv.push_arg_float(d); nv.push_arg_float(d)
    nv.push_arg_int(r or 255); nv.push_arg_int(g or 0); nv.push_arg_int(b or 0); nv.push_arg_int(al or 128)
    nv.push_arg_bool(false); nv.push_arg_bool(false); nv.push_arg_int(2); nv.push_arg_bool(false)
    nv.push_arg_string(""); nv.push_arg_string(""); nv.push_arg_bool(false)
    nv.end_call("28477EC23D892089")   -- DRAW_MARKER
end
function util.draw_box(c1, c2, c3, r, g, b, a)
    if type(c1) ~= "table" or type(c2) ~= "table" then return end
    local x0, y0, z0 = c1.x, c1.y, c1.z
    local x1, y1, z1 = c2.x, c2.y, c2.z
    r = r or 255; g = g or 255; b = b or 255; a = a or 255
    local function L(ax, ay, az, bx, by, bz) util.draw_line(ax, ay, az, bx, by, bz, r, g, b, a) end
    L(x0,y0,z0, x1,y0,z0); L(x1,y0,z0, x1,y1,z0); L(x1,y1,z0, x0,y1,z0); L(x0,y1,z0, x0,y0,z0)
    L(x0,y0,z1, x1,y0,z1); L(x1,y0,z1, x1,y1,z1); L(x1,y1,z1, x0,y1,z1); L(x0,y1,z1, x0,y0,z1)
    L(x0,y0,z0, x0,y0,z1); L(x1,y0,z0, x1,y0,z1); L(x1,y1,z0, x1,y1,z1); L(x0,y1,z0, x0,y1,z1)
end
function util.set_waypoint(x, y)
    nv.begin_call(); nv.push_arg_float(x); nv.push_arg_float(y); nv.end_call("FE43368D2AA4F2FC")   -- SET_NEW_WAYPOINT
end
-- get_model_info(hash) -> { min=v3, max=v3 } from GET_MODEL_DIMENSIONS out-params.
local __mi_min, __mi_max
function util.get_model_info(hash)
    if type(hash) == "string" then hash = util.joaat(hash) end
    if not __mi_min then __mi_min = memory.alloc(24); __mi_max = memory.alloc(24) end
    nv.begin_call(); nv.push_arg_int(hash); nv.push_arg_pointer(__mi_min); nv.push_arg_pointer(__mi_max)
    nv.end_call("03E8D3D5F549087A")   -- GET_MODEL_DIMENSIONS
    return { min = v3.new(memory.read_vector3(__mi_min)), max = v3.new(memory.read_vector3(__mi_max)) }
end
function util.get_tps() return 60 end
function util.is_bigmap_active() return false end
function util.get_session_players_bitflag() return 0 end
function util.get_session_code() return "" end
-- get_weapons/get_vehicles return Stand's catalogs ({hash=,label_key=,...}); we don't expose those yet,
-- so return empty lists (scripts iterate them to build pickers -> the picker is empty, no crash).
-- get_weapons(): every weapon as {hash, label_key, name}. Data is the full Stand weapons list (109) from
-- C++ __stand_get_weapons. Also build a label_key->readable map so util.get_label_text resolves weapon names.
__stand_label_map = __stand_label_map or {}
function util.get_weapons()
    local w = __stand_get_weapons and __stand_get_weapons() or {}
    local out = {}
    for i, e in ipairs(w) do
        __stand_label_map[e.l] = e.d
        out[i] = { hash = util.joaat(e.n), label_key = e.l, name = e.d }
    end
    return out
end
if __stand_get_weapons then for _, e in ipairs(__stand_get_weapons()) do __stand_label_map[e.l] = e.d end end
-- util.get_vehicles(): every vehicle as {name=model, hash=}. Names come from the full Stand vehicle_items
-- list (864) exposed by C++ __stand_get_vehicles. Scripts categorize via IS_THIS_MODEL_A_CAR/PLANE/etc.
function util.get_vehicles()
    local names = __stand_get_vehicles and __stand_get_vehicles() or {}
    local out = {}
    for i, name in ipairs(names) do out[i] = { name = name, hash = util.joaat(name) } end
    return out
end
-- get_objects() over the foundation data.objects() (gtaDiscoveryApi object catalog). Empty until the
-- Spooner object catalog is fetched (loads lazily when that page is first opened). (Batch 8)
function util.get_objects()
    local objs = data.objects()
    local out = {}
    for i, e in ipairs(objs) do out[i] = { name = e.name, hash = e.hash, label = e.label } end
    return out
end
-- Request a model and yield until it loads (script-thread; callers run in coroutines so yield is safe).
function util.request_model(hash)
    if type(hash) == "string" then hash = util.joaat(hash) end
    local tries = 0
    repeat
        nv.begin_call(); nv.push_arg_int(hash); nv.end_call("963D27A58DF860AC")   -- REQUEST_MODEL
        nv.begin_call(); nv.push_arg_int(hash); nv.end_call("98A4EB5D89A0C952")   -- HAS_MODEL_LOADED (matches our crossmap)
        if nv.get_return_value_bool() then return hash end
        util.yield(); tries = tries + 1
    until tries >= 100
    return hash
end
function __model_done(hash)
    nv.begin_call(); nv.push_arg_int(hash); nv.end_call("E532F5D78798DAAB")       -- SET_MODEL_AS_NO_LONGER_NEEDED
end
-- read_colons_and_tabs_file: parse "key:value" / "key<TAB>value" lines into a table.
function util.read_colons_and_tabs_file(path)
    local out = {}
    local f = io.open(path, "r")
    if not f then return out end
    for line in f:lines() do
        local k, v = string.match(line, "^([^:\t]+)[:\t]%s*(.*)$")
        if k then out[string.strip(k)] = v end
    end
    f:close()
    return out
end


-- ===== util: colour math (pure-Lua) =====
function util.rgb2hsv(r, g, b)
    r, g, b = r/255, g/255, b/255
    local mx, mn = math.max(r,g,b), math.min(r,g,b)
    local h, s, v, d = 0, 0, mx, (math.max(r,g,b) - math.min(r,g,b))
    s = mx == 0 and 0 or d / mx
    if d ~= 0 then
        if mx == r then h = (g - b) / d % 6
        elseif mx == g then h = (b - r) / d + 2
        else h = (r - g) / d + 4 end
        h = h * 60; if h < 0 then h = h + 360 end
    end
    return h, s, v
end
function util.hsv2rgb(h, s, v)
    local c = v * s
    local x = c * (1 - math.abs((h / 60) % 2 - 1))
    local m = v - c
    local r, g, b = 0, 0, 0
    if     h < 60  then r, g, b = c, x, 0
    elseif h < 120 then r, g, b = x, c, 0
    elseif h < 180 then r, g, b = 0, c, x
    elseif h < 240 then r, g, b = 0, x, c
    elseif h < 300 then r, g, b = x, 0, c
    else                r, g, b = c, 0, x end
    return math.floor((r+m)*255+0.5), math.floor((g+m)*255+0.5), math.floor((b+m)*255+0.5)
end
function util.calculate_luminance(r, g, b) return (0.2126*r + 0.7152*g + 0.0722*b) / 255 end
function util.calculate_contrast(r1,g1,b1, r2,g2,b2)
    local l1, l2 = util.calculate_luminance(r1,g1,b1), util.calculate_luminance(r2,g2,b2)
    if l1 < l2 then l1, l2 = l2, l1 end
    return (l1 + 0.05) / (l2 + 0.05)
end
function util.is_contrast_sufficient(r1,g1,b1, r2,g2,b2) return util.calculate_contrast(r1,g1,b1, r2,g2,b2) >= 4.5 end
function util.get_closest_hud_colour(r, g, b) return 0 end
util.get_closest_hud_color = util.get_closest_hud_colour
function util.get_blip_display(blip) return 0 end

-- ===== util: utf conversions (identity — our strings are already utf8) =====
function util.utf8_to_utf16(s) return s end
function util.utf16_to_utf8(s) return s end

-- ===== util: input / misc stubs (features we don't host -> no-op / best-effort) =====
function util.is_key_down(vk) return false end
function util.set_busy(b) end
function util.request_stop() end
function util.remove_handler(...) end
function util.draw_centred_text(...) end
util.draw_centered_text = util.draw_centred_text
function util.give_script_host(...) end
function util.ensure_package_is_installed(...) return true end
function util.new_toast_config(...) return {} end
function util.toast_config_get_flags(...) return 0 end
function util.is_os_thread() return false end
function util.is_soup_netintel_inited() return false end
function util.is_valid_file_name(s) return s ~= nil and s ~= "" and not string.find(s, '[\\/:%*%?"<>|]') end
function util.set_nullptr_preference(...) end
function util.execute_in_os_thread(fn) if fn then return fn() end end   -- run inline
function util.spoof_script_thread(fn) if fn then return fn() end end
function util.clear_commands_and_native_event_handlers() end
util.clear_commands_and_event_handlers = util.clear_commands_and_native_event_handlers
function util.dispatch_on_stop(...) end
function util.dispatch_on_pre_stop(...) end
function util.i_really_need_manual_access_to_process_apis(...) end
function util.require_no_lag(fn) if fn then return fn() end end
function util.play_wav(...) end
function util.arspinner_is_enabled() return false end
function util.set_cam_quaternion(...) end
function util.get_gps_route(...) return {} end
function util.blip_handle_to_pointer(b) return 0 end
function util.write_colons_file(path, t)
    local f = io.open(path, "w"); if not f then return false end
    for k, v in pairs(t) do f:write(tostring(k) .. ": " .. tostring(v) .. "\n") end
    f:close(); return true
end

-- ===== util: graceland / ui3dscene / ip / rtti / sc-block / internal_* (no-ops / stubs) =====
function util.graceland_enable(...) end
function util.graceland_disable(...) end
function util.graceland_is_enabled() return false end
function util.ui3dscene_set_element_2d_pos(...) end
util.ui3dscene_set_element_2d_position = util.ui3dscene_set_element_2d_pos
function util.ui3dscene_set_element_2d_size(...) end
function util.ui3dscene_set_element_background_color(...) end
util.ui3dscene_set_element_background_colour = util.ui3dscene_set_element_background_color
function util.ip_from_string(s) return 0 end
function util.ip_to_string(ip) return "0.0.0.0" end
function util.ip_get_as(ip) return 0 end
function util.ip_get_location(ip) return {} end
function util.get_rtti_name(ptr) return "" end
function util.get_rtti_hierarchy(ptr) return {} end
function util.sc_block() end
function util.sc_unblock() end
function util.sc_is_blocked() return false end
function util.reverse_joaat(hash) return "" end   -- hash->string db not bundled
function util.internal_emit_bad_practice_w7uoni5ptt(...) end
function util.internal_emit_deprecated_hzpyiownhj(...) end
function util.internal_is_keep_running_implied_uuqepkb32o() return true end
function util.internal_prerun_rantpgscmu(...) end
function util.internal_yield_zfvasowkyumq(...) return thread.yield() end

-- ===== native_invoker uno_* (auto-typed unified call = our unified_*) + behavior toggles (Batch 7) =====
native_invoker.uno_void    = native_invoker.unified_void
native_invoker.uno_int     = native_invoker.unified_int
native_invoker.uno_bool    = native_invoker.unified_bool
native_invoker.uno_float   = native_invoker.unified_float
native_invoker.uno_string  = native_invoker.unified_string
native_invoker.uno_pointer = native_invoker.unified_pointer
native_invoker.uno_vector3 = native_invoker.unified_vector3
function native_invoker.accept_bools_as_ints(...) end       -- our invoker already coerces forgivingly: no-op
function native_invoker.accept_nils_as_strings(...) end
function native_invoker.c_style_int_to_bool_casts(...) end

-- ===== memory extras (Batch 7; vector3 packed floats at +0/+4/+8, matching read_vector3) =====
function memory.write_vector3(addr, x, y, z)
    if type(x) == "table" then x, y, z = x.x, x.y, x.z end
    memory.write_float(addr, x or 0.0); memory.write_float(addr + 4, y or 0.0); memory.write_float(addr + 8, z or 0.0)
end
function memory.get_name_of_this_module() return "" end
function memory.scan_script(...) return 0 end
