-- ===== lang (table-backed; translation files deferred to Phase 2) =====
-- Stand's lang.register(text) registers a label and returns its id. We use the text itself as the id
-- (identity) so labels stay plain strings and the menu shows English; TranslateLabels can remap later.
__stand_lang = __stand_lang or {}
function lang.register(text, ...)
    if type(text) == "table" then            -- namespace+table form
        for k, v in pairs(text) do __stand_lang[k] = v end
        return
    end
    if text ~= nil then __stand_lang[text] = __stand_lang[text] or text end
    return text
end
function lang.set_translate(code) __stand_current_translate = code end
function lang.translate(key, value)          -- 2-arg = setter, 1-arg = getter
    if value ~= nil then __stand_lang[key] = value return end
    return __stand_lang[key]
end
function lang.find(k) return __stand_lang[k] end
function lang.get_string(k) return __stand_lang[k] or k end
function lang.get_localised(k) return __stand_lang[k] or k end
lang.get_localized = lang.get_localised
function lang.get_current() return "en" end
function lang.is_english() return true end
-- lang stubs over our table (Batch 7)
function lang.find_builtin(k) return __stand_lang[k] end
function lang.find_registered(k) return __stand_lang[k] end
function lang.get_code_for_soup() return "en" end
function lang.is_automatically_translated() return false end
function lang.is_builtin(code) return code == "en" end
function lang.is_code_valid(code) return type(code) == "string" and code ~= "" end
function lang.is_mine(code) return code == "en" end
function lang.get_country_name(code) return "" end
