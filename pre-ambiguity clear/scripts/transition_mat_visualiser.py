import re
import pandas as pd

raw_text = """
0: 
Object (2 properties)
sum: 
1760872562.8467526
transition_class: 
0
1: 
Object (2 properties)
sum: 
313681638.91102946
transition_class: 
1
2: 
Object (2 properties)
sum: 
673578434.472794
transition_class: 
2
3: 
Object (2 properties)
sum: 
189719631.38177085
transition_class: 
3
4: 
Object (2 properties)
sum: 
61532931.61165747
transition_class: 
10
5: 
Object (2 properties)
sum: 
10705660235.511559
transition_class: 
11
6: 
Object (2 properties)
sum: 
731150277.7886795
transition_class: 
12
7: 
Object (2 properties)
sum: 
309343399.9480392
transition_class: 
13
8: 
Object (2 properties)
sum: 
720097806.4600031
transition_class: 
20
9: 
Object (2 properties)
sum: 
9179076135.060097
transition_class: 
21
10: 
Object (2 properties)
sum: 
46246335964.9615
transition_class: 
22
11: 
Object (2 properties)
sum: 
3127066964.5795336
transition_class: 
23
12: 
Object (2 properties)
sum: 
29509613.460799634
transition_class: 
30
13: 
Object (2 properties)
sum: 
1060615043.2431525
transition_class: 
31
14: 
Object (2 properties)
sum: 
493102658.7165135
transition_class: 
32
15: 
Object (2 properties)
sum: 
12568860411.687973
transition_class: 
33
"""

matches = re.findall(r'sum:\s*([\d\.]+)\s*transition_class:\s*(\d+)', raw_text)

matrix_data = []
for sum_val, t_class in matches:
    t_class_int = int(t_class)
    # Original sum is assumed to be in m^2. Convert to km^2:
    val_km2 = float(sum_val) / 1_000_000 
    
    from_class = t_class_int // 10
    to_class = t_class_int % 10
    
    matrix_data.append({
        'From_Class_2020': from_class, 
        'To_Class_2025': to_class, 
        'Area_km2': val_km2
    })

df = pd.DataFrame(matrix_data)
transition_matrix = df.pivot(index='From_Class_2020', columns='To_Class_2025', values='Area_km2').fillna(0)

class_names = {0: 'Water', 1: 'Trees', 2: 'Crops', 3: 'Built'}
transition_matrix = transition_matrix.rename(index=class_names, columns=class_names)

# Add sum row and column
transition_matrix['Total'] = transition_matrix.sum(axis=1)
transition_matrix.loc['Total'] = transition_matrix.sum(axis=0)

print("State-Wide Transition Matrix (Area in sq kilometers):")
print(transition_matrix.round(4)) # Rounded for readability

import numpy as np

core_mat = transition_matrix.drop(index='Total', columns='Total')

initial_area = core_mat.sum(axis=1)
final_area = core_mat.sum(axis=0)
net_change = final_area - initial_area
pct_change = (net_change / initial_area) * 100

retention = pd.Series(np.diag(core_mat), index=core_mat.index)
retention_rate = (retention / initial_area) * 100

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