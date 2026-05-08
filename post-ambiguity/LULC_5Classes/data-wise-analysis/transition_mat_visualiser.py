import re
import pandas as pd
import numpy as np

# Note: The raw_text provided in your prompt appears to be the LULC area for a single year 
# (single digits 0-4). For the transition matrix to work properly, ensure you paste the 
# transition output where classes are two digits (e.g., 12 for Trees to Crops, or 43).
raw_text = """
0: 
Object (2 properties)
sum: 
36.16031242058838
transition_class: 
0
1: 
Object (2 properties)
sum: 
8.626016719198077
transition_class: 
1
2: 
Object (2 properties)
sum: 
10.274697298353244
transition_class: 
2
3: 
Object (2 properties)
sum: 
3.4586629261259203
transition_class: 
3
4: 
Object (2 properties)
sum: 
4.581863322805607
transition_class: 
4
5: 
Object (2 properties)
sum: 
4.608272056571691
transition_class: 
10
6: 
Object (2 properties)
sum: 
522.6604199641116
transition_class: 
11
7: 
Object (2 properties)
sum: 
67.4226003414944
transition_class: 
12
8: 
Object (2 properties)
sum: 
32.04113654968986
transition_class: 
13
9: 
Object (2 properties)
sum: 
0.6960704707031249
transition_class: 
14
10: 
Object (2 properties)
sum: 
20.327789517953477
transition_class: 
20
11: 
Object (2 properties)
sum: 
1149.5640492557864
transition_class: 
21
12: 
Object (2 properties)
sum: 
1066.8347021820932
transition_class: 
22
13: 
Object (2 properties)
sum: 
113.55909445627283
transition_class: 
23
14: 
Object (2 properties)
sum: 
6.609691943148762
transition_class: 
24
15: 
Object (2 properties)
sum: 
1.6755281835248153
transition_class: 
30
16: 
Object (2 properties)
sum: 
42.360006325765966
transition_class: 
31
17: 
Object (2 properties)
sum: 
16.427179561347117
transition_class: 
32
18: 
Object (2 properties)
sum: 
259.9048384957718
transition_class: 
33
19: 
Object (2 properties)
sum: 
1.0981170000651046
transition_class: 
34
20: 
Object (2 properties)
sum: 
4.998127476711865
transition_class: 
40
21: 
Object (2 properties)
sum: 
6.201522238916996
transition_class: 
41
22: 
Object (2 properties)
sum: 
12.25034851961548
transition_class: 
42
23: 
Object (2 properties)
sum: 
0.8331245210899201
transition_class: 
43
24: 
Object (2 properties)
sum: 
6.880620003944578
transition_class: 
44
"""

# Updated regex to match BOTH 'class' and 'transition_class' regardless of which comes first
matches = re.findall(r'(?:transition_class|class):\s*(\d+)\s*sum:\s*([\d\.]+)|sum:\s*([\d\.]+)\s*(?:transition_class|class):\s*(\d+)', raw_text)

matrix_data = []
for match in matches:
    # Extract values depending on which side of the OR (|) matched
    if match[0]:
        t_class = match[0]
        sum_val = match[1]
    else:
        sum_val = match[2]
        t_class = match[3]
        
    t_class_int = int(t_class)
    
    # Original sum is assumed to be in m^2. Convert to km^2:
    val_km2 = float(sum_val) 
    
    # Math splits a two-digit integer into its two parts (e.g., 34 -> 3 and 4)
    # If a single digit is passed (e.g. 4), it treats it as 0 -> 4.
    from_class = t_class_int // 10
    to_class = t_class_int % 10
    
    matrix_data.append({
        'From_Class_2020': from_class, 
        'To_Class_2025': to_class, 
        'Area_km2': val_km2
    })

df = pd.DataFrame(matrix_data)

if not df.empty:
    transition_matrix = df.pivot(index='From_Class_2020', columns='To_Class_2025', values='Area_km2').fillna(0)

    # Force the matrix to be a 5x5 grid in case any transition pairs were missing/0 in GEE
    all_classes = [0, 1, 2, 3, 4]
    transition_matrix = transition_matrix.reindex(index=all_classes, columns=all_classes, fill_value=0)

    # --- UPDATED TO 5 CLASSES ---
    class_names = {0: 'Water', 1: 'Trees', 2: 'Crops', 3: 'Built', 4: 'Bare'}
    transition_matrix = transition_matrix.rename(index=class_names, columns=class_names)

    # Add sum row and column
    transition_matrix['Total'] = transition_matrix.sum(axis=1)
    transition_matrix.loc['Total'] = transition_matrix.sum(axis=0)

    print("State-Wide Transition Matrix (Area in sq kilometers):")
    print(transition_matrix.round(4)) # Rounded for readability

    # --- Analysis Section ---
    core_mat = transition_matrix.drop(index='Total', columns='Total')

    initial_area = core_mat.sum(axis=1)
    final_area = core_mat.sum(axis=0)
    net_change = final_area - initial_area
    
    # Use np.where to prevent division by zero if a class didn't exist in 2020
    pct_change = np.where(initial_area > 0, (net_change / initial_area) * 100, 0)

    retention = pd.Series(np.diag(core_mat), index=core_mat.index)
    retention_rate = np.where(initial_area > 0, (retention / initial_area) * 100, 0)

    transition_only = core_mat.copy()
    np.fill_diagonal(transition_only.values, 0)

    analysis_df = pd.DataFrame({
        'Initial (km2)': initial_area,
        'Final (km2)': final_area,
        'Net Change': net_change,
        'Change (%)': pct_change,
        'Retention (%)': retention_rate,
        'Lost Most To': transition_only.idxmax(axis=1),
        'Loss Amt': transition_only.max(axis=1),
        'Gained Most From': transition_only.idxmax(axis=0),
        'Gain Amt': transition_only.max(axis=0)
    }).round(2)

    print("\nClass-Level Transition Analysis:")
    print(analysis_df)

else:
    print("No valid data found to parse. Please check the raw_text formatting.")