import pandas as pd
import re

def convert_gee_string_to_sqkm(group_str):
    """Parses the non-standard GEE dictionary string and converts sums to sq km."""
    if pd.isna(group_str):
        return group_str
        
    # Regex to find 'sum=' followed by scientific/floating numbers
    def replacer(match):
        area_sq_m = float(match.group(1))
        area_sq_km = area_sq_m / 1e6
        return f"sum={area_sq_km}"
        
    return re.sub(r"sum=([0-9\.E]+)", replacer, group_str)

# 1. Load the CSV file
input_file = 'V2_Bihar_District_LULC_2025.csv' 
output_file = 'V2_Bihar_District_LULC_2025.csv'
df = pd.read_csv(input_file)

# 2. Convert the 'groups' column 
df['groups'] = df['groups'].apply(convert_gee_string_to_sqkm)

# 3. Convert the state area column (st_area_sh) to sq km
if 'st_area_sh' in df.columns:
    df['st_area_sh'] = df['st_area_sh'] / 1e6

# 4. (Optional) Convert shape length to km by dividing by 1000
if 'st_length_' in df.columns:
    df['st_length_'] = df['st_length_'] / 1e3

# 5. Save the converted dataframe to a new CSV
df.to_csv(output_file, index=False)
print("Conversion complete. Saved to", output_file)