local nv = native_invoker

-- ===== players (Stand veneer; the 1:1 functions delegate to the foundation `player` layer) =====
function players.user() return player.id() end
function players.user_ped() return player.ped() end
function players.list() return player.list() end
function players.list_except(pid)
    local out = {}
    for _, p in ipairs(players.list()) do if p ~= pid then out[#out + 1] = p end end
    return out
end
function players.exists(pid) return player.exists(pid) end
function players.get_ped(pid) return player.get_ped(pid) end
-- __entity_coords: legacy global helper (GET_ENTITY_COORDS). Retained for any script that calls it
-- directly; the layer's own queries go through the foundation entity/player layers.
function __entity_coords(ent)
    nv.begin_call(); nv.push_arg_int(ent); nv.push_arg_bool(true)
    nv.end_call("3FEF770D40960D5A"); return nv.get_return_value_vector3()    -- GET_ENTITY_COORDS
end
function players.get_position(pid) return player.coords(pid) end
function players.get_cam_pos(pid) return players.get_position(pid) end
function players.get_name(pid) return player.name(pid) end
function players.are_stats_ready(pid) return true end
function players.is_marked_as_modder(pid) return false end
function players.get_money(pid) return 0 end
function players.get_wallet(pid) return 0 end
function players.get_bank(pid) return 0 end
function players.get_kd(pid) return 0.0 end
function players.get_rank(pid) return 0 end
function players.get_rp(pid) return 0 end
function players.get_org_type(pid) return 0 end
function players.get_boss(pid) return -1 end
function players.get_script_host() return players.user() end
function players.set_wanted_level(pid, level)
    if pid == players.user() then
        nv.begin_call(); nv.push_arg_int(pid); nv.push_arg_int(level); nv.push_arg_bool(false)
        nv.end_call("39FF19C64EF7DA5B")   -- SET_PLAYER_WANTED_LEVEL
        nv.begin_call(); nv.push_arg_int(pid); nv.push_arg_bool(false)
        nv.end_call("E0A7D1E497FFCD6F")   -- SET_PLAYER_WANTED_LEVEL_NOW
    end
end
-- list variants
function players.list_only(pids)
    local set = {}; for _, p in ipairs(pids or {}) do set[p] = true end
    local out = {}; for _, p in ipairs(players.list()) do if set[p] then out[#out + 1] = p end end
    return out
end
function players.list_all_with_excludes(excl)
    local set = {}; for _, p in ipairs(excl or {}) do set[p] = true end
    local out = {}; for _, p in ipairs(players.list()) do if not set[p] then out[#out + 1] = p end end
    return out
end
function players.get_host() return players.user() end   -- session host index needs session data — safe default
function players.get_focused() return players.user() end
-- vehicle/location (native-backed for self + remote where the native allows)
function players.is_in_vehicle(pid) return player.in_vehicle(pid) end
function players.get_vehicle_model(pid)
    nv.begin_call(); nv.push_arg_int(players.get_ped(pid)); nv.push_arg_bool(false)
    nv.end_call("9A9112A0FE9A4713"); local veh = nv.get_return_value_int()   -- GET_VEHICLE_PED_IS_IN
    if veh == 0 then return 0 end
    return entities.get_model_hash(veh)
end
function players.get_cam_rot(pid) return v3.new(0.0, 0.0, 0.0) end
function players.get_waypoint(pid) return v3.new(0.0, 0.0, 0.0) end
local function __set_coords(ent, x, y, z)
    nv.begin_call(); nv.push_arg_int(ent)
    nv.push_arg_float(x); nv.push_arg_float(y); nv.push_arg_float(z)
    nv.push_arg_bool(false); nv.push_arg_bool(false); nv.push_arg_bool(false); nv.push_arg_bool(true)
    nv.end_call("06843DA7060A026B")   -- SET_ENTITY_COORDS
end
function players.teleport_3d(pid, x, y, z)
    if pid == players.user() then __set_coords(players.user_ped(), x, y, z) end
end
function players.teleport_2d(pid, x, y) players.teleport_3d(pid, x, y, 0.0) end
-- status flags (no remote-readable native / needs session data) -> safe defaults
function players.get_kills(pid) return 0 end
function players.get_deaths(pid) return 0 end
function players.is_godmode(pid) return false end
function players.is_in_interior(pid) return false end
function players.is_otr(pid) return false end
function players.is_out_of_sight(pid) return false end
function players.is_typing(pid) return false end
function players.is_using_vpn(pid) return false end
function players.is_using_controller(pid) return false end
function players.is_using_rc_vehicle(pid) return false end
function players.is_visible(pid) return true end
function players.is_marked_as_admin(pid) return false end
function players.is_marked_as_modder_or_admin(pid) return false end
function players.is_marked_as_attacker(pid) return false end
function players.get_bounty(pid) return 0 end
function players.get_org_colour(pid) return 0 end
function players.get_language(pid) return 0 end
function players.get_rockstar_id(pid) return 0 end
players.get_rockstar_id_2 = players.get_rockstar_id
function players.get_name_with_tags(pid) return players.get_name(pid) end
function players.get_tags_string(pid) return "" end
function players.add_detection(pid, ...) end
function players.send_sms(pid, msg) end
function players.give_pickup_reward(pid, ...) end
function players.on_join(cb) end
function players.on_leave(cb) end
function players.on_flow_event_done(cb) end
-- add_command_hook(f): f(pid, player_root_ref) per player. Our player_root is invalid (no per-player
-- menus), so the isValid() gate skips f — runs without error, just builds nothing. (lua_runtime:336)
function players.add_command_hook(f)
    local cb = function(p)
        local cmd = menu.player_root(p)
        if cmd:isValid() then f(p, cmd) end
    end
    players.on_join(cb)
    for _, p in ipairs(players.list()) do
        util.create_thread(function() cb(p) end)
    end
end
function players.dispatch_on_join() end
function players.detections_root(p) return __stand_wrap(-1) end
players.get_pos = players.get_position
-- network identity / damage modifiers (need session + net-object data we don't expose) -> safe stubs (Batch 7)
function players.get_ip(pid) return 0 end
function players.get_ip_string(pid) return "0.0.0.0" end
function players.get_connect_ip(pid) return 0 end
function players.get_connect_port(pid) return 0 end
function players.get_lan_ip(pid) return 0 end
function players.get_lan_port(pid) return 0 end
function players.get_port(pid) return 0 end
function players.get_host_token(pid) return 0 end
function players.get_host_token_hex(pid) return "" end
function players.get_host_queue(pid) return 0 end
function players.get_host_queue_position(pid) return 0 end
function players.get_net_player(pid) return 0 end
function players.get_spectate_target(pid) return -1 end
function players.clan_get_motto(pid) return "" end
function players.get_weapon_damage_modifier(pid) return 1.0 end
function players.get_melee_weapon_damage_modifier(pid) return 1.0 end
function players.get_millis_since_discovery(pid) return 0 end
function players.internal_get_join_callbacks() return {} end
