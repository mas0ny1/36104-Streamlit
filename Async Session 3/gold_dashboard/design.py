"""Design tokens shared by the app (and mirrored in the notebook).

Three fixed mappings, enforced everywhere:
  entity -> hue          (one colour per country on every panel)
  epistemic status -> line style  (solid = reported, dashed = estimated)
  data class -> mark     (lines = levels, bars = period changes, areas = composition)
"""

# Dark theme: black paper, white ink. Country hues are stepped for the black
# surface (OKLCH L 0.48-0.67, >= 3:1 contrast); keep in sync with
# .streamlit/config.toml.
PAPER = "#000000"
INK   = "#ffffff"
FAINT = "#d4d4cc"   # secondary text: captions, axis labels (~13:1 on black)
GHOST = "#4a4a44"   # rules, axis lines
GOLD  = "#d9a82e"   # reserved for the price of gold itself

HUES = {
    "China":     "#c2302f",
    "China + HK":"#c2302f",
    "Russia":    "#4c84d6",
    "Iran":      "#2f9a6c",
    "India":     "#c0891a",
    "Turkey":    "#ad69ab",
    "UK + US":   "#8a9aa8",
    "West":      "#8a9aa8",
    "UAE + Gulf":"#77776f",
    "other":     "#4f4f49",
}
REST = "#77776f"          # rest-of-world grey (figure-ground)

def hue(entity: str) -> str:
    return HUES.get(entity, REST)

SOLID = None              # plotly default dash
DASH  = "dash"            # estimated / inferred series

# Discrete, political demand shocks -- drawn as vertical rules on every time axis
EVENTS = [
    ("2022-02-28", "freeze"),
    ("2022-06-26", "G7 ban"),
    ("2025-06-13", "Iran war"),
    ("2025-11-01", "CBR sells"),
    ("2026-05-15", "escalation"),
]

# Mine replenishment reference rates, tonnes per month (USGS-derived, hand-entered yearly)
MINE_TOTAL_TPM   = 300    # ~3,600 t/yr global mine supply
MINE_WESTERN_TPM = 200    # ~2,400 t/yr that enters the Western circuit
