import pandas as pd
import re

# 1) Load the datasets
# Update these file paths if your files are named differently
df_2016 = pd.read_csv('./lulcs/V2_Bihar_District_LULC_2016.csv')
df_2025 = pd.read_csv('./lulcs/V2_Bihar_District_LULC_2025.csv')

DISTRICT_COL = 'District'

def parse_gee_groups(row_str):
    """
    Extracts class IDs and areas from Earth Engine's string format.
    Enforces exactly 5 classes (0: Water, 1: Trees, 2: Crops, 3: Built, 4: Bare)
    """
    # PRE-INITIALIZE all 5 classes to 0.0 to prevent missing columns
    parsed_dict = {0: 0.0, 1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0}
    
    if pd.isna(row_str): 
        return parsed_dict
    
    # Use regex to find all instances of 'class=X' and 'sum=Y'
    matches = re.findall(r'class=(\d+),\s*sum=([\d\.E\+\-]+)', str(row_str))
    
    for cls, area in matches:
        cls_int = int(cls)
        if cls_int in parsed_dict:
            # BUG FIX: Removed the "/ 1_000_000" here. 
            # The GEE script already converted to km^2, doing it twice made it 0.00!
            parsed_dict[cls_int] = float(area) 
            
    return parsed_dict

# 2) Parse the 'groups' column into usable dataframes
parsed_2016 = df_2016['groups'].apply(parse_gee_groups).apply(pd.Series)
parsed_2016[DISTRICT_COL] = df_2016[DISTRICT_COL]

parsed_2025 = df_2025['groups'].apply(parse_gee_groups).apply(pd.Series)
parsed_2025[DISTRICT_COL] = df_2025[DISTRICT_COL]

# 3) Process Changes
numeric_2016 = parsed_2016.drop(columns=[DISTRICT_COL])
numeric_2025 = parsed_2025.drop(columns=[DISTRICT_COL])

# The actual shifted area is half the sum of absolute differences 
total_changed_area = abs(numeric_2025 - numeric_2016).sum(axis=1) / 2
total_district_area = numeric_2016.sum(axis=1)

# Create a results DataFrame
change_results = pd.DataFrame({
    DISTRICT_COL: parsed_2016[DISTRICT_COL],
    'Total_Changed_Area_km^2': total_changed_area,
    'Total_District_Area_km^2': total_district_area,
    'Percent_Change': (total_changed_area / total_district_area) * 100
})

# --- OUTPUT 1: Top 5 by Percentage Change ---
top_5_highest_pct = change_results.nlargest(5, 'Percent_Change')

print("--- Top 5 Districts with Highest LULC % Change (2016-2025) ---")
for index, row in top_5_highest_pct.iterrows():
    print(f"{row[DISTRICT_COL]}: {row['Percent_Change']:.2f}% (Changed {row['Total_Changed_Area_km^2']:,.2f} km^2 out of {row['Total_District_Area_km^2']:,.2f} km^2)")
print("\n")

# --- OUTPUT 2: Top 5 by Volume Change (Total Area Shifted) ---
top_5_highest_vol = change_results.nlargest(5, 'Total_Changed_Area_km^2')

print("--- Top 5 Districts with Highest LULC Volume Change (2016-2025) ---")
for index, row in top_5_highest_vol.iterrows():
    print(f"{row[DISTRICT_COL]}: Changed {row['Total_Changed_Area_km^2']:,.2f} km^2 (which is {row['Percent_Change']:.2f}% of its {row['Total_District_Area_km^2']:,.2f} km^2 area)")
print("\nCompleted!")