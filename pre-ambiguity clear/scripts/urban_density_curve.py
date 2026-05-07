import pandas as pd
import matplotlib.pyplot as plt

# 1. Load the GEE Output
# Update this path to where you saved the exported CSV
csv_path = 'Bihar_Urban_Gradient_Rings.csv' 
df = pd.read_csv(csv_path)

# Total area of each ring in square meters 
# (You can also calculate this dynamically in GEE, but these are constants based on your geometry)
# Since the exact area depends on the road network shape, you should ideally pull total ring area from GEE. 
# For this script, we assume you added a total_area column or we normalize based on relative distance.
# Assuming your CSV has 'sum' (Built area in sqm). 

# Let's map distances for the X-axis
distance_mapping = {'0-1km': 1, '1-3km': 3, '3-5km': 5}
df['Distance_km'] = df['ring'].map(distance_mapping)

# Pivot the table so we have distances as rows and Years as columns for Built Area
pivot_df = df.pivot(index='Distance_km', columns='Year', values='sum')

# Convert Square Meters to Square Kilometers for easier reading
pivot_df = pivot_df / 1_000_000 

# 2. Plotting the Distance vs. Urban Density Curve
plt.figure(figsize=(10, 6))

colors = {2016: 'blue', 2020: 'green', 2025: 'red'}

for year in pivot_df.columns:
    plt.plot(pivot_df.index, pivot_df[year], marker='o', linewidth=2, 
             label=f'Year {year}', color=colors[year])

plt.title('Urban Expansion Gradient in Bihar (2016-2025)\nDistance from Major Roads vs. Built-up Area', fontsize=14)
plt.xlabel('Distance from Road Network (km)', fontsize=12)
plt.ylabel('Total Built-up Area (Sq Km)', fontsize=12)
plt.xticks([1, 3, 5], ['0-1 km', '1-3 km', '3-5 km'])
plt.grid(True, linestyle='--', alpha=0.7)
plt.legend(title='Year')
plt.tight_layout()

# Save and show the plot
plt.savefig('Urban_Density_Curve.png', dpi=300)
plt.show()

print("Distance vs. Urban Density curve generated successfully.")