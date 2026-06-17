local nv = native_invoker

-- ===== entities (native-backed) =====
function entities.get_user_vehicle_as_handle()
    nv.begin_call(); nv.push_arg_int(players.user_ped()); nv.push_arg_bool(false)
    nv.end_call("9A9112A0FE9A4713"); return nv.get_return_value_int()                         -- GET_VEHICLE_PED_IS_IN
end
entities.get_user_vehicle_as_pointer = entities.get_user_vehicle_as_handle
entities.get_user_personal_vehicle_as_handle = entities.get_user_vehicle_as_handle
-- Pure query delegations to the foundation entity layer (identical natives — one implementation).
function entities.get_position(ent) return entity.coords(ent) end
entities.get_pos = entities.get_position
function entities.get_rotation(ent) return entity.rotation(ent) end
entities.get_rot = entities.get_rotation
function entities.get_model_hash(ent) return entity.model(ent) end
entities.get_model_uhash = entities.get_model_hash
function entities.get_health(ent) return entity.health(ent) end
function entities.is_player_ped(ent)
    nv.begin_call(); nv.push_arg_int(ent); nv.end_call("12534C348C6CB68B")   -- IS_PED_A_PLAYER
    return nv.get_return_value_bool()
end
function entities.is_invulnerable(ent) return false end
-- Gravity/gear/rpm/upgrade ops would write the entity's CVehicle in memory. handle->pointer IS now
-- available (memory.handle_to_pointer), but these are ACCEPTED SAFE STUBS by design: no installed script
-- depends on them, the exact field offsets/semantics (multiplier vs absolute, gear/rpm layout) are
-- unverified for this build, and a wrong write corrupts vehicle physics. They return harmless defaults so
-- scripts run. Implement individually (with a verified offset + entities.is_vehicle guard) only if a real
-- script needs one. (Phase 4: closed as accepted stubs.)
function entities.set_gravity_multiplier(ent, mult) end
function entities.set_gravity(ent, on) end
function entities.get_gravity(ent) return true end
function entities.get_current_gear(ent) return 0 end
function entities.set_current_gear(ent, g) end
function entities.get_next_gear(ent) return 0 end
function entities.set_next_gear(ent, g) end
function entities.get_rpm(ent) return 0.0 end
function entities.set_rpm(ent, r) end
function entities.get_upgrade_value(ent, slot) return -1 end
function entities.get_upgrade_max_value(ent, slot) return -1 end
function entities.set_upgrade_value(ent, slot, val) end
function entities.get_owner(ent) return -1 end
function entities.detach_wheel(ent, wheel) end
function entities.player_info_get_game_state(info) return 0 end
function entities.get_player_info(ent) return 0 end
function entities.get_net_object(ent) return 0 end
function entities.get_can_migrate(ent) return true end
function entities.set_can_migrate(ent, v) end
function entities.give_control(ent) return entities.request_control(ent) end
entities.give_control_by_handle = entities.give_control
entities.give_control_by_pointer = entities.give_control
-- handle<->pointer: handle_to_pointer resolves the REAL CEntity* via memory.handle_to_pointer (fwScriptGuid).
-- pointer_to_handle has no cheap reverse, so it returns its input (scripts use the pointer directly for
-- memory reads; they rarely need the reverse). any_to_handle/has_handle unchanged.
function entities.handle_to_pointer(h) return memory.handle_to_pointer(h) end
function entities.pointer_to_handle(p) return p end
function entities.any_to_handle(e) return e end
function entities.has_handle(e) return e ~= nil and e ~= 0 end
-- Resolve an arg that may be a handle OR an already-resolved pointer to a usable CEntity* (0 if neither).
-- All callers read through memory.read_* (addr-guarded), so a bad value degrades to 0, never a crash.
local function __ent_ptr(e)
    if e == nil or e == 0 then return 0 end
    local p = memory.handle_to_pointer(e)   -- treat as handle first
    if p ~= 0 then return p end
    return e                                 -- already a pointer
end
-- Entity memory ops with verified CVehicle offsets (Infamous dump, same build): boost gauge @0x300,
-- handling data ptr @0x960. Others stay stubbed until their offsets are verified.
function entities.get_boost_charge(veh)
    local p = __ent_ptr(veh); if p == 0 then return 0.0 end
    return memory.read_float(p + 0x300)
end
function entities.vehicle_get_handling(veh)
    local p = __ent_ptr(veh); if p == 0 then return 0 end
    return memory.read_long(p + 0x960)       -- CHandlingData*
end
-- Request network control — delegate to the foundation entity layer (identical loop + natives).
function entities.request_control(ent, timeout)
    return entity.request_control(entities.any_to_handle(ent), timeout)
end
-- Pool enumeration via the foundation entity layer (C++ entity_pool::get). Pickups not enumerated.
function entities.get_all_peds_as_handles() return entity.all_peds() end
function entities.get_all_vehicles_as_handles() return entity.all_vehicles() end
function entities.get_all_objects_as_handles() return entity.all_objects() end
function entities.get_all_pickups_as_handles() return {} end
entities.get_all_peds_as_pointers = entities.get_all_peds_as_handles
entities.get_all_vehicles_as_pointers = entities.get_all_vehicles_as_handles
entities.get_all_objects_as_pointers = entities.get_all_objects_as_handles
entities.get_all_pickups_as_pointers = entities.get_all_pickups_as_handles
-- Entity spawners (native-backed). pos is a v3/coord table {x,y,z}; model may be a hash or name.
-- networked defaults true, mission(script-host) defaults true. Each requests + yields for the model first.
function entities.create_ped(ped_type, model, pos, heading, networked, mission)
    if type(model) == "string" then model = util.joaat(model) end
    util.request_model(model)
    if networked == nil then networked = true end
    nv.begin_call()
    nv.push_arg_int(ped_type or 4); nv.push_arg_int(model)
    nv.push_arg_float(pos.x); nv.push_arg_float(pos.y); nv.push_arg_float(pos.z)
    nv.push_arg_float(heading or 0.0)
    nv.push_arg_bool(networked); nv.push_arg_bool(mission ~= false)
    nv.end_call("D49F9B0955C367DE")   -- CREATE_PED
    local h = nv.get_return_value_int()
    __model_done(model)
    return h
end
function entities.create_vehicle(model, pos, heading, networked, mission)
    if type(model) == "string" then model = util.joaat(model) end
    util.request_model(model)
    if networked == nil then networked = true end
    nv.begin_call()
    nv.push_arg_int(model)
    nv.push_arg_float(pos.x); nv.push_arg_float(pos.y); nv.push_arg_float(pos.z)
    nv.push_arg_float(heading or 0.0)
    nv.push_arg_bool(networked); nv.push_arg_bool(mission ~= false); nv.push_arg_bool(false)
    nv.end_call("AF35D0D2583051B0")   -- CREATE_VEHICLE
    local h = nv.get_return_value_int()
    __model_done(model)
    return h
end
function entities.create_object(model, pos, networked, mission)
    if type(model) == "string" then model = util.joaat(model) end
    util.request_model(model)
    if networked == nil then networked = true end
    nv.begin_call()
    nv.push_arg_int(model)
    nv.push_arg_float(pos.x); nv.push_arg_float(pos.y); nv.push_arg_float(pos.z)
    nv.push_arg_bool(networked); nv.push_arg_bool(mission ~= false); nv.push_arg_bool(false)
    nv.end_call("9A294B2138ABB884")   -- CREATE_OBJECT_NO_OFFSET
    local h = nv.get_return_value_int()
    __model_done(model)
    return h
end

local __del_buf
function entities.delete_by_handle(h)
    if not h or h == 0 then return false end
    entities.request_control(h)
    nv.begin_call(); nv.push_arg_int(h); nv.push_arg_bool(false); nv.push_arg_bool(true)
    nv.end_call("AD738C3085FE7E11")   -- SET_ENTITY_AS_MISSION_ENTITY
    if not __del_buf then __del_buf = memory.alloc(8) end
    memory.write_int(__del_buf, h)
    nv.begin_call(); nv.push_arg_pointer(__del_buf); nv.end_call("AE3CBE5BF394C9C9")   -- DELETE_ENTITY(&handle)
    return true
end
entities.delete = entities.delete_by_handle
entities.delete_by_pointer = entities.delete_by_handle
