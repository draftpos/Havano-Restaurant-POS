__version__ = "0.0.1"

# Apply trial balance currency conversion fix when module is imported
# This ensures the fix is applied as soon as the app is loaded
try:
    from havano_restaurant_pos.overrides import apply_trial_balance_fix
    apply_trial_balance_fix()
except Exception:
    # Silently fail if override cannot be applied (e.g., during app installation)
    # The fix will be applied via after_migrate hook as well
    pass
