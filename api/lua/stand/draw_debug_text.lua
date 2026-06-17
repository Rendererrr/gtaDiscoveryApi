-- util.draw_debug_text overlay (Stand API). Scripts call util.draw_debug_text("...") (defined in
-- stand\util.lua) and each tick's lines are published into the global __draw_debug_front; this script is
-- the ONLY place the look lives -- edit it freely (position, colours, box, font). No-ops when nothing is
-- drawn. Loaded by stand\init.lua via __api_load so it ships + reloads with the Stand dialect.
overlay.on_draw("draw_debug_text", function()
    local lines = __draw_debug_front
    if not lines or #lines == 0 then return end

    local lh = text.height(font.item) + 2
    local x, y = 24, 64
    local maxw = 0
    for i = 1, #lines do
        local w = text.width(font.item, lines[i])
        if w > maxw then maxw = w end
    end

    draw.rect(x - 8, y - 5, x + maxw + 8, y + #lines * lh + 5, 12, 12, 18, 175, 4)
    draw.rect(x - 8, y - 5, x - 5,        y + #lines * lh + 5, 168, 85, 247, 255, 4)  -- accent edge

    for i = 1, #lines do
        text.draw(font.item, x, y + (i - 1) * lh, 230, 230, 235, 255, lines[i])
    end
end)
