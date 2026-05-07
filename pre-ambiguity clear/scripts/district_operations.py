import pandas as pd
import re
import matplotlib.pyplot as plt

# 1) Load the newly exported 10-year dataset
df = pd.read_csv('supaul_LULC_2016_2025_Yearly.csv')

# 2) Reuse our parsing function from earlier
def parse_gee_groups(row_str):
    if pd.isna(row_str): return {}
    matches = re.findall(r'class=(\d+),\s*sum=([\d\.E\+\-]+)', str(row_str))
    return {int(cls): float(area) for cls, area in matches}

# 3) Expand the groups into columns
parsed_df = df['groups'].apply(parse_gee_groups).apply(pd.Series).fillna(0)
parsed_df['Year'] = df['Year']

# Rename classes
class_labels = {0: 'Water', 1: 'Trees', 2: 'Crops', 3: 'Built'}
parsed_df = parsed_df.rename(columns=class_labels)

# 4) Plot the Time-Series (Line Chart)
plt.figure(figsize=(10, 6))
plt.plot(parsed_df['Year'], parsed_df['Water'], label='Water', color='blue', marker='o')
plt.plot(parsed_df['Year'], parsed_df['Trees'], label='Trees', color='darkgreen', marker='o')
plt.plot(parsed_df['Year'], parsed_df['Crops'], label='Crops', color='gold', marker='o')
plt.plot(parsed_df['Year'], parsed_df['Built'], label='Built Area', color='red', marker='o')

plt.title('supaul LULC Change (2016-2025)')
plt.ylabel('Area (Square Meters)')
plt.xlabel('Year')
plt.legend()
plt.grid(True, linestyle='--', alpha=0.6)
plt.ticklabel_format(style='plain', axis='y') # Remove scientific notation
plt.show()