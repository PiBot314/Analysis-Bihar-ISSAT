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

# 3) Identify District with Highest Change (Task 3)
# Calculate absolute difference between 2025 and 2016 for all numeric columns
diff_df = abs(parsed_2025.drop(columns=[DISTRICT_COL]) - parsed_2016.drop(columns=[DISTRICT_COL]))

# Sum the differences across the row to get total volume of change
diff_df['Total_Absolute_Change_sqm'] = diff_df.sum(axis=1)
diff_df[DISTRICT_COL] = parsed_2016[DISTRICT_COL]

# Isolate the highest row
highest_change_row = diff_df.loc[diff_df['Total_Absolute_Change_sqm'].idxmax()]

print("--- Change Analysis ---")
print(f"District with Highest LULC Change (2016-2025): {highest_change_row[DISTRICT_COL]}")
print(f"Total Area Changed: {highest_change_row['Total_Absolute_Change_sqm']:,.2f} sqm\n")

# 4) Visualize District-Wise Data (Task 4)
os.makedirs('district_charts', exist_ok=True)

class_labels = {0: 'Water', 1: 'Trees', 2: 'Crops', 3: 'Built'}
colors = ['blue', 'darkgreen', 'gold', 'red']

print("Generating charts...")
for index, row in parsed_2025.iterrows():
    dist_name = row[DISTRICT_COL]
    
    # Filter to just the LULC columns and apply names
    data_2025 = row.drop(DISTRICT_COL).rename(class_labels)
    
    plt.figure(figsize=(8, 5))
    data_2025.plot(kind='bar', color=colors, edgecolor='black')
    
    plt.title(f'LULC Composition 2025 - {dist_name}')
    plt.ylabel('Area (sqm)')
    plt.xlabel('LULC Class')
    plt.xticks(rotation=0)
    
    # Force y-axis to display regular numbers instead of scientific notation
    plt.ticklabel_format(style='plain', axis='y')
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    
    plt.tight_layout()
    # Save using a safe filename format
    safe_name = str(dist_name).replace(" ", "_")
    plt.savefig(f'district_charts_2025/{safe_name}_2025_LULC.png')
    plt.close()

print("Static charts generated successfully in the 'district_charts_2025' directory.")