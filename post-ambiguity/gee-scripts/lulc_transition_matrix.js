// 1. Extract Bihar State Boundary
// Use the Inspector tool or print(stateDataset.limit(1)) to verify the exact column name
var debug = 10;


var year2016 = true;
var year2020 = true;
var year2025 = true;

if (debug>=1){
  print("Starting Program\n");
}
if (debug>=2){
  print("Step 1: Get State Data\n");
}
var biharState = stateDataset.filter(ee.Filter.eq('State', 'BR'));
  
// 2. Extract Districts within Bihar
// Attribute filtering (Fastest, assuming district data has a state column)
if (debug>=2){
  print("Step 2: Get District Data\n")
}
var biharDistricts = districtDataset.filter(ee.Filter.eq('State', 'BR'));

if (debug>=3){
  print('District Count = ', biharDistricts.size());
}
// 3. Set Area of Interest (AOI) on the Map
if (debug>=2){
  print("Step 3: Set Map Location, add Base Layers\n");
}
Map.centerObject(biharDistricts, 6);
Map.addLayer(biharState, {color: 'white'}, 'Bihar State Boundary', false);
Map.addLayer(biharDistricts.geometry().simplify(100), {color: 'blue'}, 'Bihar Districts');
// this is done to reduce the amount of calculation, and 100 m still very precise wrt state
if (year2016&&debug>=2){
  print("Step 4 (2016): Extract Bihar Data, and Add LULC Layers\n");
}
if (year2016){
  if (debug>=3){
    print("Extracting Data\n");
  }
  var bihar2016 = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterBounds(biharState)
    .filterDate('2016-01-01', '2016-12-31')
    // .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 25))
    .select('label')
    .mode()
    .clip(biharState);
  // WHY? Because Dynamic World just contains LULC probabilities and not bands.

  print('Dynamic World - 2016:', bihar2016);
  
  // Mask out Snow/Ice (Class 8) (not equal to class 8)
  var lcMasked = bihar2016.updateMask(bihar2016.neq(8)); 
  
  // Remap Dynamic World classes to 5 target categories
  // Old classes: 0(Water), 1(Trees), 2(Grass), 3(FloodVeg), 5(Shrub), 4(Crops), 6(Built), 7(Bare)
  // New classes: 0(Water), 1(Veg),   1(Veg),   1(Veg),      1(Veg),   2(Crops), 3(Built), 4(Bare)
  var bihar2016_remap = lcMasked.remap(
    [0, 1, 2, 3, 5, 4, 6, 7], 
    [0, 1, 1, 1, 1, 2, 3, 4]
  ).rename('class');
  
  // Update visual parameters for 5 classes
  var labelVis = {
    min: 0, max: 4,
    palette: ['blue', 'darkgreen', 'yellow', 'red', 'gray'] // Added gray for Barren/Bare
  };
  
  var bihar2016_remap = lcMasked.remap([0, 1, 4, 6, 7], [0, 1, 2, 3, 4]).rename('class');
  
  Map.addLayer(bihar2016_remap, labelVis, 'Bihar(2016) - 5 Classes');
  
  if (debug>=4){
    print("Added LULC Layer of 2016\n");
  }
  if (debug>=2){
    print("Step 5: Doing District Calculations\n");
  }
  
  // Combine pixel area with the remapped class band
  var areaImage = ee.Image.pixelArea().addBands(bihar2016_remap);
  
  // Group the area sums by class for every district geometry
  var districtAreas2016 = areaImage.reduceRegions({
    collection: biharDistricts,
    reducer: ee.Reducer.sum().group({
      groupField: 1,      // The band index containing the class labels
      groupName: 'class'  // The key name for the output dictionary
    }),
    scale: 250 // 250 m <<< Size of district and reduces calculation
  });
  
  
  var biharLULC_2016 = areaImage.reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'class'
    }),
    
  geometry: biharState.geometry(),scale: 250, maxPixels: 1e10});
  // maxPixels is to prevent too much computatioin

  if (debug>=3){
    Export.table.toDrive({
      collection: districtAreas2016,
      description: 'V2_Bihar_District_LULC_2016',
      fileFormat: 'CSV'
    });
    print('2016 State Area Statistics:', biharLULC_2016.get('groups'));
  }
}

if (year2020&&debug>=2){
  print("Step 4 (2020): Extract Bihar Data, and Add LULC Layers\n");
}
if (year2020){
  if (debug>=3){
    print("Extracting Data\n");
  }
  var bihar2020 = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterBounds(biharState)
    .filterDate('2020-01-01', '2020-12-31')
    // .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 25))
    .select('label')
    .mode()
    .clip(biharState);
  // WHY? Because Dynamic World just contains LULC probabilities and not bands.

  print('Dynamic World - 2020:', bihar2020);
  
  // Mask out Snow/Ice (Class 8) (not equal to class 8)
  var lcMasked = bihar2020.updateMask(bihar2020.neq(8)); 
  
  // Remap Dynamic World classes to 5 target categories
  // Old classes: 0(Water), 1(Trees), 2(Grass), 3(FloodVeg), 5(Shrub), 4(Crops), 6(Built), 7(Bare)
  // New classes: 0(Water), 1(Veg),   1(Veg),   1(Veg),      1(Veg),   2(Crops), 3(Built), 4(Bare)
  var bihar2020_remap = lcMasked.remap(
    [0, 1, 2, 3, 5, 4, 6, 7], 
    [0, 1, 1, 1, 1, 2, 3, 4]
  ).rename('class');
  
  // Update visual parameters for 5 classes
  var labelVis = {
    min: 0, max: 4,
    palette: ['blue', 'darkgreen', 'yellow', 'red', 'gray'] // Added gray for Barren/Bare
  };
  
  var bihar2020_remap = lcMasked.remap([0, 1, 4, 6, 7], [0, 1, 2, 3, 4]).rename('class');
  
  Map.addLayer(bihar2020_remap, labelVis, 'Bihar(2020) - 5 Classes');
  
  if (debug>=4){
    print("Added LULC Layer of 2020\n");
  }
  if (debug>=2){
    print("Step 5: Doing District Calculations\n");
  }
  
  // Combine pixel area with the remapped class band
  var areaImage = ee.Image.pixelArea().addBands(bihar2020_remap);
  
  // Group the area sums by class for every district geometry
  var districtAreas2020 = areaImage.reduceRegions({
    collection: biharDistricts,
    reducer: ee.Reducer.sum().group({
      groupField: 1,      // The band index containing the class labels
      groupName: 'class'  // The key name for the output dictionary
    }),
    scale: 250 // 250 m <<< Size of district and reduces calculation
  });
  
  
  var biharLULC_2020 = areaImage.reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'class'
    }),
    
  geometry: biharState.geometry(),scale: 250, maxPixels: 1e10});
  // maxPixels is to prevent too much computatioin

  if (debug>=3){
    Export.table.toDrive({
      collection: districtAreas2020,
      description: 'V2_Bihar_District_LULC_2020',
      fileFormat: 'CSV'
    });
    print('2020 State Area Statistics:', biharLULC_2020.get('groups'));
  }
}

if (year2025&&debug>=2){
  print("Step 4 (2025): Extract Bihar Data, and Add LULC Layers\n");
}
if (year2025){
  if (debug>=3){
    print("Extracting Data\n");
  }
  var bihar2025 = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterBounds(biharState)
    .filterDate('2025-01-01', '2025-12-31')
    // .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 25))
    .select('label')
    .mode()
    .clip(biharState);
  // WHY? Because Dynamic World just contains LULC probabilities and not bands.

  print('Dynamic World - 2025:', bihar2025);
  
  // Mask out Snow/Ice (Class 8) (not equal to class 8)
  var lcMasked = bihar2025.updateMask(bihar2025.neq(8)); 
  
  // Remap Dynamic World classes to 5 target categories
  // Old classes: 0(Water), 1(Trees), 2(Grass), 3(FloodVeg), 5(Shrub), 4(Crops), 6(Built), 7(Bare)
  // New classes: 0(Water), 1(Veg),   1(Veg),   1(Veg),      1(Veg),   2(Crops), 3(Built), 4(Bare)
  var bihar2025_remap = lcMasked.remap(
    [0, 1, 2, 3, 5, 4, 6, 7], 
    [0, 1, 1, 1, 1, 2, 3, 4]
  ).rename('class');
  
  // Update visual parameters for 5 classes
  var labelVis = {
    min: 0, max: 4,
    palette: ['blue', 'darkgreen', 'yellow', 'red', 'gray'] // Added gray for Barren/Bare
  };
  
  var bihar2025_remap = lcMasked.remap([0, 1, 4, 6, 7], [0, 1, 2, 3, 4]).rename('class');
  
  Map.addLayer(bihar2025_remap, labelVis, 'Bihar(2025) - 5 Classes');
  
  if (debug>=4){
    print("Added LULC Layer of 2025\n");
  }
  if (debug>=2){
    print("Step 5: Doing District Calculations\n");
  }
  
  // Combine pixel area with the remapped class band
  var areaImage = ee.Image.pixelArea().addBands(bihar2025_remap);
  
  // Group the area sums by class for every district geometry
  var districtAreas2025 = areaImage.reduceRegions({
    collection: biharDistricts,
    reducer: ee.Reducer.sum().group({
      groupField: 1,      // The band index containing the class labels
      groupName: 'class'  // The key name for the output dictionary
    }),
    scale: 250 // 250 m <<< Size of district and reduces calculation
  });
  
  
  var biharLULC_2025 = areaImage.reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'class'
    }),
    
  geometry: biharState.geometry(),scale: 250, maxPixels: 1e10});
  // maxPixels is to prevent too much computatioin

  if (debug>=3){
    Export.table.toDrive({
      collection: districtAreas2025,
      description: 'V2_Bihar_District_LULC_2025',
      fileFormat: 'CSV'
    });
    print('2025 State Area Statistics:', biharLULC_2025.get('groups'));
  }
}2
// GOTTEN ALL DETAILS SO NOW TRANSITION MATRIX TIME!!

if (year2016 && year2020 && year2025) {
  if (debug>=2){
    print("Step 6: Generating Transition Matrices\n");
  }

  // Calculate Transition Matrix 2016 -> 2020
  // Multiplies older year by 10 and adds newer year
  var transition_16_20 = bihar2016_remap.multiply(10).add(bihar2020_remap).rename('transition_class');

  // [CHANGED] Calculate Transition Matrix 2020 -> 2025
  var transition_20_25 = bihar2020_remap.multiply(10).add(bihar2025_remap).rename('transition_class');

  // [CHANGED] Calculate transition areas for the State (2016 -> 2020)
  var transitionArea_16_20 = ee.Image.pixelArea().addBands(transition_16_20).reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'transition_class'
    }),
    geometry: biharState.geometry(),
    scale: 250,
    maxPixels: 1e10
  });

  
  var transitionArea_20_25 = ee.Image.pixelArea().addBands(transition_20_25).reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'transition_class'
    }),
    geometry: biharState.geometry(),
    scale: 250,
    maxPixels: 1e10
  });

  if (debug>=3) {
    print('Transition 2016->2020 Areas (State):', transitionArea_16_20.get('groups')); // [CHANGED] Output 16-20 transitions
    print('Transition 2020->2025 Areas (State):', transitionArea_20_25.get('groups')); // [CHANGED] Output 20-25 transitions
  }
}

if (debug>=1){
  print("End of Program");
}
