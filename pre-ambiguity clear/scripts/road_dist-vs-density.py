import pandas as pd
import matplotlib.pyplot as plt
import io

# 1. Load the data 
with open("/Users/arnav/Arnav/Colleg(e) lol/issat cgd/project/outputs/road_stuff/Bihar_Urban_Gradient_2025.csv", "r") as f:
    csv_data = f.read()

# Read into a pandas DataFrame
df = pd.read_csv(io.StringIO(csv_data))

# 2. Filter out the cumulative buffers to focus on the multi-ring gradient
gradient_df = df[df['Zone'].str.startswith('Multi-ring')].copy()

# Extract just the distance label for the X-axis (e.g., '0-1 km')
gradient_df['Distance'] = gradient_df['Zone'].str.replace('Multi-ring: ', '')

# 3. Plotting the curve
plt.figure(figsize=(8, 5))
plt.plot(gradient_df['Distance'], gradient_df['Built_Up_Percent'], 
         marker='o', linestyle='-', color='blue', linewidth=2, markersize=8)

# Formatting the plot
plt.title('Urban Density vs. Distance from Road Network', fontsize=14)
plt.xlabel('Distance from Road (km)', fontsize=12)
plt.ylabel('Built-Up Density (%)', fontsize=12)
plt.grid(True, linestyle='--', alpha=0.7)
plt.ylim(0, max(gradient_df['Built_Up_Percent']) + 5) # Scale Y-axis slightly above max value

# Add percentage data labels to each point
for i, val in enumerate(gradient_df['Built_Up_Percent']):
    plt.annotate(f"{val:.1f}%", 
                 (i, val), 
                 textcoords="offset points", 
                 xytext=(0, 10), 
                 ha='center',
                 fontsize=10,
                 fontweight='bold')

plt.tight_layout()

# Save the plot
plt.savefig('urban_density_curve.png', dpi=300)
plt.show()