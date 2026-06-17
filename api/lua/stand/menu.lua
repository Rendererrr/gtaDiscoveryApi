-- Stand menu.* — OOP wrappers over the C++ __smenu builders + the higher-level composite/helper builders.
-- A ref is an object {id=N} whose metatable exposes the builder/query methods (__ref_methods) plus a
-- `.value` property mapping to get_value/set_value.
__ref_methods = {}
__ref_mt = {}
__ref_mt.__index = function(self, k)
    if k == "value" then return menu.get_value(self) end
    return __ref_methods[k]
end
__ref_mt.__newindex = function(self, k, v)
    if k == "value" then menu.set_value(self, v); return end
    rawset(self, k, v)
end
local function __wrap(id) if id == nil then return nil end return setmetatable({ id = id }, __ref_mt) end
local function __rid(r) if type(r) == "table" then return r.id end return r end
__stand_wrap = __wrap   -- exposed for menu helpers / other layer files

for _, name in ipairs({ "list", "action", "toggle", "slider", "slider_float", "click_slider", "readonly", "divider", "hyperlink" }) do
    menu[name] = function(parent, ...) return __wrap(__smenu[name](__rid(parent), ...)) end
    __ref_methods[name] = function(self, ...) return menu[name](self, ...) end
end

-- colour: Stand has two signatures: (parent,name,cmds,help, cb, r,g,b,a) and (parent,name,cmds,help,
-- default_table, alpha_bool, cb). Normalize to the C++ builder (cb, r, g, b, a). cb gets a {r,g,b,a} table.
function menu.colour(parent, name, cmds, help, a5, a6, a7, a8, a9)
    local cb, r, g, b, al
    if type(a5) == "table" then
        r, g, b, al = a5.r or 255, a5.g or 255, a5.b or 255, a5.a or 255
        cb = (type(a7) == "function") and a7 or (type(a6) == "function") and a6 or nil
    else
        cb = (type(a5) == "function") and a5 or nil
        r, g, b, al = a6 or 255, a7 or 255, a8 or 255, a9 or 255
    end
    return __wrap(__smenu.colour(__rid(parent), name, cmds, help, cb or function() end, r, g, b, al))
end
menu.color = menu.colour
function menu.rainbow(parent, name, cmds, help, cb) return menu.colour(parent, name, cmds, help, cb, 255, 0, 0, 255) end
__ref_methods.colour = function(self, ...) return menu.colour(self, ...) end
__ref_methods.color  = __ref_methods.colour
__ref_methods.rainbow = function(self, ...) return menu.rainbow(self, ...) end
function menu.my_root() return __wrap(__smenu.root()) end
function menu.get_value(r) return __smenu.get_value(__rid(r)) end
function menu.set_value(r, v) return __smenu.set_value(__rid(r), v) end
function menu.is_ref_valid(r) return __smenu.is_ref_valid(__rid(r)) end

-- Tree introspection / mutation (back the C++ __smenu functions).
function menu.get_menu_name(r) return __smenu.get_menu_name(__rid(r)) end
function menu.set_menu_name(r, n) __smenu.set_menu_name(__rid(r), n) end
function menu.get_help_text(r) return __smenu.get_help_text(__rid(r)) end
function menu.set_help_text(r, t) __smenu.set_help_text(__rid(r), tostring(t or "")) end
function menu.get_parent(r) return __wrap(__smenu.get_parent(__rid(r))) end
function menu.get_children(r)
    local ids, out = __smenu.get_children(__rid(r)), {}
    for i, id in ipairs(ids) do out[i] = __wrap(id) end
    return out
end
function menu.ref_by_command_name(name) return __wrap(__smenu.ref_by_command_name(name)) end
function menu.ref_by_path(p) return __wrap(__smenu.ref_by_path(p)) end
function menu.ref_by_rel_path(base, p) return __wrap(-1) end   -- Stand built-in relative paths: unresolved
function menu.get_default_state(r) return __smenu.get_default_state(__rid(r)) end
function menu.apply_default_state(r) __smenu.apply_default_state(__rid(r)) end
function menu.delete(r) __smenu.delete(__rid(r)) end
function menu.trigger(r) __smenu.trigger(__rid(r)) end
-- System info: report the highest edition (3) so scripts don't gate features off behind an edition check.
function menu.get_edition() return 3 end
function menu.get_version() return 999999 end
function menu.get_activation_key_hash() return 0 end
function menu.is_in_screenshot_mode() return false end

-- Ref-object method forms.
__ref_methods.get_value          = function(self) return menu.get_value(self) end
__ref_methods.set_value          = function(self, v) return menu.set_value(self, v) end
__ref_methods.set_str_value      = function(self, v) return menu.set_value(self, v) end
__ref_methods.get_menu_name      = function(self) return menu.get_menu_name(self) end
__ref_methods.set_menu_name      = function(self, n) return menu.set_menu_name(self, n) end
__ref_methods.get_help_text      = function(self) return menu.get_help_text(self) end
__ref_methods.set_help_text      = function(self, t) return menu.set_help_text(self, t) end
__ref_methods.get_parent         = function(self) return menu.get_parent(self) end
__ref_methods.get_children       = function(self) return menu.get_children(self) end
__ref_methods.get_default_state  = function(self) return menu.get_default_state(self) end
__ref_methods.apply_default_state= function(self) return menu.apply_default_state(self) end
__ref_methods.delete             = function(self) return menu.delete(self) end
__ref_methods.trigger            = function(self) return menu.trigger(self) end
__ref_methods.is_ref_valid       = function(self) return menu.is_ref_valid(self) end
__ref_methods.focus              = function(self) end
-- Stand ref-object methods used by lua_runtime helpers / scripts (CamelCase variants).
__ref_methods.isValid            = function(self) return menu.is_ref_valid(self) end
__ref_methods.ref                = function(self) return self end
__ref_methods.getChildren        = function(self) return menu.get_children(self) end
__ref_methods.getType            = function(self) return 0 end
__ref_methods.getValue           = function(self) return menu.get_value(self) end
__ref_methods.setValue           = function(self, v) return menu.set_value(self, v) end
__ref_methods.attachBefore       = function(self, other) end
__ref_methods.attachAfter        = function(self, other) end

-- player_root(pid) / shadow_root(): per-player + hidden menu roots. We don't host per-player menus, so
-- return an invalid-parent wrapper — building on it creates an orphan (hidden) page; isValid() is false,
-- so command hooks that gate on it become no-ops rather than crashing.
function menu.player_root(pid) return __stand_wrap(-1) end
function menu.shadow_root() return __stand_wrap(-1) end

-- ===== menu helpers (Lua, on top of the C++ menu.* builders) =====
function menu.toggle_loop(parent, label, cmds, help, loop_fn, on_stop)
    local ref = menu.toggle(parent, label, cmds, help, function(on) end, false)
    util.create_thread(function()
        local was_on = false
        while true do
            local on = menu.get_value(ref)
            if on then
                loop_fn()
            elseif was_on and on_stop then
                on_stop()
            end
            was_on = on
            util.yield()
        end
    end)
    return ref
end

-- Run fn each frame only while ref is in the viewport (menu open on ref's page) — matches Stand, and
-- stops off-page per-frame draws (e.g. teleport lines) from firing when you're elsewhere.
function menu.on_tick_in_viewport(ref, fn)
    local rid = __rid(ref)
    return util.create_thread(function()
        while true do
            if __smenu.node_in_viewport(rid) then fn() end
            util.yield()
        end
    end)
end

function menu.trigger_commands(s) util.log("[stand] trigger_commands: " .. tostring(s)) end
function menu.trigger_command(s) menu.trigger_commands(s) end

-- ===== composite builders (over menu.list / menu.action / menu.click_slider) =====
-- list_action: a submenu of selectable options; clicking one fires action(value, label). Stand passes
-- options as { {value, label, command_names, help}, ... } and the action receives the clicked option's
-- value AND its label (Heist's language picker uses the label as the 2nd arg).
function menu.list_action(parent, name, cmds, help, options, action)
    local lst = menu.list(parent, name, cmds, help)
    for _, opt in ipairs(options or {}) do
        local val, label = opt[1], opt[2]
        menu.action(lst, tostring(label), opt[3], opt[4] or "", function() if action then action(val, label) end end)
    end
    return lst
end
-- textslider: a submenu listing string options; clicking one fires action(1-based index). Stand passes
-- options as a list of strings. (We render it as a submenu of actions rather than an inline slider.)
function menu.textslider(parent, name, cmds, help, options, action)
    local lst = menu.list(parent, name, cmds, help)
    for i, label in ipairs(options or {}) do
        menu.action(lst, tostring(label), {}, "", function() if action then action(i) end end)
    end
    return lst
end
menu.textslider_stateful = menu.textslider
-- list_select: a persistent integer selection over { {value,label,..}, ... } with default + on_change(value).
-- Implemented as a click_slider so get_value/set_value return the selected value.
function menu.list_select(parent, name, cmds, help, options, default, on_change)
    options = options or {}
    local lo, hi = nil, nil
    for _, opt in ipairs(options) do
        local v = opt[1]
        if type(v) == "number" then lo = lo and math.min(lo, v) or v; hi = hi and math.max(hi, v) or v end
    end
    lo = lo or 1; hi = hi or math.max(1, #options)
    return menu.click_slider(parent, name, cmds, help, lo, hi, default or lo, 1,
        function(v) if on_change then on_change(v) end end)
end
-- text_input: a real text field. Clicking opens the menu's text popup; on Enter the C++ side fires
-- on_change(text) (stand_menu::on_text_commit). get_value/set_value read/write the field.
function menu.text_input(parent, name, cmds, help, on_change, default)
    return __wrap(__smenu.text_input(__rid(parent), name, cmds, help, on_change, default))
end
-- show_command_box(prefix): "<command> <initial>" — opens the text popup; on Enter the typed text is
-- dispatched to the named command's handler (the 2nd fn passed to menu.action). Render thread opens it.
function menu.show_command_box(prefix)
    prefix = tostring(prefix or "")
    local cmd_name, rest = string.match(prefix, "^(%S+)%s*(.*)$")
    if not cmd_name then return end
    if __smenu.request_command_box then __smenu.request_command_box(cmd_name, rest or "") end
end
function menu.show_command_box_click_based(prefix) return menu.show_command_box(prefix) end
function menu.command_box_is_open() return false end

-- ===== menu shims (UI affordances we don't host -> safe no-ops / best-effort) =====
function menu.link(parent, ref, ...) return __stand_wrap(-1) end   -- link/shortcut to a built-in: no-op
function menu.focus(ref) end
function menu.is_focused(ref) return false end
function menu.is_open() return false end
-- Focused list's "current/total" text (e.g. "2/12"), from the live menu selection — so cursor-gated
-- per-frame effects (e.g. Heist's teleport-preview lines) fire only for the row actually hovered.
function menu.get_active_list_cursor_text(...) return __smenu.cursor_text() end
function menu.get_menu_name_path(ref) return menu.get_menu_name(ref) end
-- show_warning(ref, click_type, text, on_confirm): we have no modal; the user already clicked, so run
-- the confirm handler (scheduled as a thread so it may yield).
function menu.show_warning(ref, click_type, text, on_confirm, on_cancel)
    if on_confirm then util.create_thread(on_confirm) end
end

-- ===== menu getters/setters/tree ops (best-effort: getters return sensible defaults, setters + tree ops
-- are no-ops or map to what we host — goal is no nil-calls; we build menus ourselves so most are inert) =====
function menu.get_min_value(r) return 0 end
function menu.get_max_value(r) return 0 end
function menu.get_step_size(r) return 1 end
function menu.get_precision(r) return 0 end
function menu.get_perm(r) return 0 end
function menu.get_type(r) return COMMAND_ACTION end
menu.type = menu.get_type
function menu.get_state(r) return menu.get_value(r) end
function menu.get_target(r) return __stand_wrap(-1) end
function menu.get_visible(r) return true end
function menu.get_command_names(r) return {} end
function menu.get_indicator_type(r) return LISTINDICATOR_OFF end
function menu.get_position(r) return 0 end
menu.get_pos = menu.get_position
function menu.get_physical(r) return 0 end
function menu.get_name_for_config(r) return menu.get_menu_name(r) end
function menu.get_current_menu_list() return {} end
function menu.get_current_ui_list() return {} end
function menu.get_main_view_pos_and_size() return 0, 0, 0, 0 end
menu.get_main_view_position_and_size = menu.get_main_view_pos_and_size
function menu.get_applicable_players(r) return {} end
function menu.are_tabs_visible() return false end
function menu.list_get_focus(r) return 0 end
function menu.list_get_focus_physical(r) return 0 end
function menu.command_box_get_dimensions() return 0, 0, 0, 0 end
function menu.set_min_value(r, v) end
function menu.set_max_value(r, v) end
function menu.set_step_size(r, v) end
function menu.set_precision(r, v) end
function menu.set_state(r, v) menu.set_value(r, v) end
function menu.set_target(r, v) end
function menu.set_visible(r, v) end
function menu.set_command_names(r, ...) end
function menu.set_indicator_type(r, v) end
function menu.set_name_for_config(r, v) end
function menu.set_temporary(r, v) end
function menu.set_action_slider_options(r, ...) end
function menu.set_list_action_options(r, ...) end
function menu.set_textslider_options(r, ...) end
function menu.add_value_replacement(r, ...) end
function menu.attach(r, ...) end
function menu.attach_before(r, ...) end
function menu.attach_after(r, ...) end
function menu.detach(r, ...) end
function menu.replace(r, ...) end
function menu.on_focus(r, fn) end
function menu.on_blur(r, fn) end
function menu.remove_handler(r, ...) end
function menu.recursively_apply_default_state(r) menu.apply_default_state(r) end
function menu.apply_command_states(...) end
function menu.save_state_in_memory(...) end
function menu.collect_garbage() end
function menu.internal_create_rainbow_carqdmtrem(...) return __stand_wrap(-1) end
function menu.default_and_delete(r) menu.delete(r) end
function menu.inline_rainbow(...) return __stand_wrap(-1) end
-- expose the (r, ...)-style ones as ref:method() forms too
for _, _m in ipairs({
    "get_min_value","get_max_value","get_step_size","get_precision","get_perm","get_type","type",
    "get_state","get_target","get_visible","get_command_names","get_indicator_type","get_position",
    "get_pos","get_physical","get_name_for_config","get_applicable_players","list_get_focus",
    "list_get_focus_physical","set_min_value","set_max_value","set_step_size","set_precision","set_state",
    "set_target","set_visible","set_command_names","set_indicator_type","set_name_for_config","set_temporary",
    "set_action_slider_options","set_list_action_options","set_textslider_options","add_value_replacement",
    "attach","attach_before","attach_after","detach","replace","on_focus","on_blur","remove_handler",
    "recursively_apply_default_state","default_and_delete",
}) do
    __ref_methods[_m] = function(self, ...) return menu[_m](self, ...) end
end

-- Ref-object method forms of the Lua-defined menu helpers.
__ref_methods.toggle_loop          = function(self, ...) return menu.toggle_loop(self, ...) end
__ref_methods.on_tick_in_viewport  = function(self, ...) return menu.on_tick_in_viewport(self, ...) end
__ref_methods.list_action          = function(self, ...) return menu.list_action(self, ...) end
__ref_methods.textslider           = function(self, ...) return menu.textslider(self, ...) end
__ref_methods.textslider_stateful  = function(self, ...) return menu.textslider(self, ...) end
__ref_methods.list_select          = function(self, ...) return menu.list_select(self, ...) end
__ref_methods.text_input           = function(self, ...) return menu.text_input(self, ...) end
__ref_methods.link                 = function(self, ...) return menu.link(self, ...) end
__ref_methods.show_warning         = function(self, ...) return menu.show_warning(self, ...) end

-- NOTE: the debug-text overlay VISUAL lives in the user-editable scripts\draw_debug_text.lua (provisioned
-- from feature_script_defaults). This layer only publishes the lines into __draw_debug_front (see util.lua).
