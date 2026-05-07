# The 2024 "Crop Increase" Anomaly

## CROP SPIKE IN 2024
In both datasets, the year 2024 shows a massive, sudden spike in "Crops" and a simultaneous crash in "Trees".

    Madhubani: Crops surged from ~1.47 billion sqm in 2023 to ~2.14 billion sqm in 2024, while Trees plummeted from ~1.15 billion to ~634 million sqm.

    Supaul: Crops jumped from ~890 million sqm in 2023 to ~1.26 billion sqm in 2024, while Trees crashed from ~706 million to ~318 million sqm.

Did a vast crop increase actually happen? No. Real-world meteorological data indicates that in 2024, Bihar experienced a severe 20% rainfall deficit (drought) during the early monsoon, followed immediately by devastating Phase-2 flash floods in late September. Standing crops in northern districts like Supaul and Madhubani were heavily damaged, meaning there was no agricultural boom.

Instead, this data spike is a textbook classification error. Machine learning classifications like Dynamic World rely on predictions based on probabilities. Severe extreme weather events drastically alter the spectral signature of the landscape. The 2024 drought and subsequent flooding likely defoliated massive swaths of agroforestry and orchards (Trees) or disrupted normal crop cycles. When the tree canopy was stripped or flooded, the automated optical sensors misinterpreted the surviving low-lying vegetation and damaged orchards as "Crops". The sharp reversal in 2025—where Trees jump back up and Crops drop back down—confirms this was an abrupt algorithmic glitch caused by seasonal extreme weather, rather than permanent land-use change.

## Other Observations from the Data

### The Inverse Crop-Tree Mirroring: 
    Across the entire 10-year dataset for both districts, "Crops" and "Trees" constantly fluctuate in opposite directions. This highlights the limitations of automated satellite classification in Bihar; mature, dense crops (like maize or sugarcane) are easily confused with trees, causing algorithmic noise year over year.

### Water Body Volatility: 
    The area of "Water" in Supaul fluctuates wildly, jumping from ~116 million sqm in 2016 to ~144 million in 2017, and constantly shifting thereafter. This reflects the volatile nature of the Kosi River floodplain, which frequently changes course, flooding agricultural land and leaving other areas dry.

### Steady Urban Expansion (with a Catch): 
    "Built" areas show a general upward trajectory in both districts, reflecting horizontal urban sprawl as cities consume flat agricultural land. However, there are years where "Built" area seemingly decreases (e.g., Supaul drops from ~543 million sqm in 2023 to ~366 million sqm in 2025). As noted in your project context, this is likely an anomaly where growing tree canopies (like courtyard gardens or bamboo thickets) gradually obscure rural rooftops from the satellite, flipping the pixel classification from "Built" to "Trees".