-- ===== filesystem (real paths) =====
-- scripts_dir/stand_dir/store_dir resolve under the *current* script's own folder (__stand_script_dir,
-- set per load_script). Scripts capture these at load time (top-level), so the value is correct when
-- they read it. resources_dir stays the shared scripts\lib\api\stand\resources path.
function filesystem.resources_dir() return __stand_resources_dir or "" end
function filesystem.scripts_dir() return __stand_script_dir or __stand_resources_dir or "" end
function filesystem.stand_dir() return __stand_script_dir or __stand_resources_dir or "" end
function filesystem.store_dir() return (__stand_script_dir or "") .. "store\\" end
function filesystem.appdata_dir() return __stand_script_dir or __stand_resources_dir or "" end
function filesystem.exists(p)
    if not p then return false end
    if __stand_is_dir and __stand_is_dir(p) then return true end
    local f = io.open(p, "r")
    if f then f:close() return true end
    return false
end
function filesystem.is_regular_file(p)
    local f = io.open(p, "r")
    if f then f:close() return not (__stand_is_dir and __stand_is_dir(p)) end
    return false
end
function filesystem.is_dir(p) return __stand_is_dir ~= nil and __stand_is_dir(p) or false end
function filesystem.mkdir(p) if __stand_mkdirs then __stand_mkdirs(p) end end
function filesystem.mkdirs(p) if __stand_mkdirs then __stand_mkdirs(p) end end
function filesystem.list_files(p) if __stand_list_files then return __stand_list_files(p) end return {} end

-- async_http is provided by C++ (stand_http) over WinHTTP; nothing to define here.
