-- Stand menu.* dialect layer.
-- The GENERIC builders/refs (list/action/toggle/slider/colour/my_root/get-set_value/tree-ops/set_ticked/
-- toggle_loop/on_tick_in_viewport + the ref metatable & __ref_methods) now live in the FOUNDATION
-- (lib\global\menu.lua), which loads first. This layer must NOT redefine those (it would clobber
-- foundation changes) and must NOT reset __ref_methods/__ref_mt -- it only APPENDS the Stand-SPECIFIC
-- composites, shims, edition spoofs, and CamelCase ref-method aliases on top of the foundation.
local function __wrap(id) if id == nil then return nil end return setmetatable({ id = id }, __ref_mt) end
local function __rid(r) if type(r) == "table" then return r.id end return r end

-- Stand built-in absolute/relative path refs (unresolved in our host).
function menu.ref_by_path(p) return __wrap(__smenu.ref_by_path(p)) end
function menu.ref_by_rel_path(base, p) return __wrap(-1) end
-- System info: report the highest edition (3) so scripts don't gate features behind an edition check.
function menu.get_edition() return 3 end
function menu.get_version() return 999999 end
function menu.get_activation_key_hash() return 0 end
function menu.is_in_screenshot_mode() return false end

-- Stand-specific ref-object method forms (APPEND to the foundation's __ref_methods; do NOT reset it).
__ref_methods.set_str_value      = function(self, v) return menu.set_value(self, v) end
__ref_methods.get_default_state  = function(self) return menu.get_default_state(self) end
__ref_methods.apply_default_state= function(self) return menu.apply_default_state(self) end
__ref_methods.focus              = function(self) end
-- CamelCase variants used by lua_runtime helpers / Stand scripts.
__ref_methods.isValid            = function(self) return menu.is_ref_valid(self) end
__ref_methods.ref                = function(self) return self end
__ref_methods.getChildren        = function(self) return menu.get_children(self) end
__ref_methods.getType            = function(self) return 0 end
__ref_methods.getValue           = function(self) return menu.get_value(self) end
__ref_methods.setValue           = function(self, v) return menu.set_value(self, v) end
__ref_methods.attachBefore       = function(self, other) end
__ref_methods.attachAfter        = function(self, other) end

-- player_root(pid) / shadow_root(): per-player + hidden menu roots. We don't host per-player menus, so
-- return an invalid-parent wrapper -- building on it creates an orphan (hidden) page; isValid() is false,
-- so command hooks that gate on it become no-ops rather than crashing.
function menu.player_root(pid) return __stand_wrap(-1) end
function menu.shadow_root() return __stand_wrap(-1) end

function menu.trigger_commands(s) util.log("[stand] trigger_commands: " .. tostring(s)) end
function menu.trigger_command(s) menu.trigger_commands(s) end

-- ===== composite builders (over the foundation menu.list / menu.action / menu.click_slider) =====
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
-- textslider: a submenu listing string options; clicking one fires action(1-based index).
function menu.textslider(parent, name, cmds, help, options, action)
    local lst = menu.list(parent, name, cmds, help)
    for i, label in ipairs(options or {}) do
        menu.action(lst, tostring(label), {}, "", function() if action then action(i) end end)
    end
    return lst
end
menu.textslider_stateful = menu.textslider
-- list_select: a persistent integer selection over { {value,label,..}, ... } with default + on_change(value).
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
-- Focused list's "current/total" text (e.g. "2/12"), from the live menu selection.
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

-- Ref-object method forms of the Stand composite/helper builders.
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
