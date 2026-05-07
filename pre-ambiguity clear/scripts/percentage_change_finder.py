import pandas as pd
import matplotlib.pyplot as plt
import re
import os

# 1) Load the datasets
# Update these file paths if your files are named differently
df_2016 = pd.read_csv('/Users/arnav/Arnav/Colleg(e) lol/issat cgd/project/outputs/Bihar_District_LULC_2016.csv')
df_2025 = pd.read_csv('/Users/arnav/Arnav/Colleg(e) lol/issat cgd/project/outputs/Bihar_District_LULC_2025.csv')

DISTRICT_COL = 'District'

def parse_gee_groups(row_str):
    """
    Extracts class IDs and areas from Earth Engine's string format:
    e.g., "[{class=0, sum=5.64E7}, {class=1, sum=3.12E8}]"
    """
    if pd.isna(row_str): 
        return {}
    
    # Use regex to find all instances of 'class=X' and 'sum=Y'
    matches = re.findall(r'class=(\d+),\s*sum=([\d\.E\+\-]+)', str(row_str))
    
    parsed_dict = {}
    for cls, area in matches:
        parsed_dict[int(cls)] = float(area)
        
    return parsed_dict

# 2) Parse the 'groups' column into usable dataframes
parsed_2016 = df_2016['groups'].apply(parse_gee_groups).apply(pd.Series).fillna(0)
parsed_2016[DISTRICT_COL] = df_2016[DISTRICT_COL]

parsed_2025 = df_2025['groups'].apply(parse_gee_groups).apply(pd.Series).fillna(0)
parsed_2025[DISTRICT_COL] = df_2025[DISTRICT_COL]

# 3) Identify District with Highest % Change (Task 3)
numeric_2016 = parsed_2016.drop(columns=[DISTRICT_COL])
numeric_2025 = parsed_2025.drop(columns=[DISTRICT_COL])

# The actual shifted area is half the sum of absolute differences 
# (since every loss in one class is registered as a gain in another)
total_changed_area = abs(numeric_2025 - numeric_2016).sum(axis=1) / 2
total_district_area = numeric_2016.sum(axis=1)

# Create a results DataFrame to hold our new calculations
change_results = pd.DataFrame({
    DISTRICT_COL: parsed_2016[DISTRICT_COL],
    'Total_Changed_Area_sqm': total_changed_area,
    'Total_District_Area_sqm': total_district_area,
    'Percent_Change': (total_changed_area / total_district_area) * 100
})

# [CHANGED] Isolate the top 5 rows with the highest percentage change
top_5_highest_pct = change_results.nlargest(5, 'Percent_Change')

print("--- Top 5 Districts with Highest LULC % Change (2016-2025) ---")
for index, row in top_5_highest_pct.iterrows():
    print(f"{row[DISTRICT_COL]}: {row['Percent_Change']:.2f}% (Changed {row['Total_Changed_Area_sqm']:,.2f} sqm out of {row['Total_District_Area_sqm']:,.2f} sqm)")
print("\n")

print("Completed!\n")