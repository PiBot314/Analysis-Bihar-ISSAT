// ==============================================================================
// STEP 6: SPATIAL HOTSPOTS, HEATMAPS & DRIVING FACTORS OF CHANGE
// ==============================================================================

// --- USER SETTINGS ---
// Toggle this to TRUE to completely remove Water <-> Other transitions from the analysis
var EXCLUDE_WATER_TRANSITIONS = false; 

// 1. DEFINE AREA OF INTEREST (Bihar)

var biharState = table.filter(ee.Filter.eq('State', 'BR'));

Map.centerObject(biharState, 7);

// 2. LOAD EXTERNAL DRIVING FACTORS
// A. Terrain (Elevation)
var elevation = ee.Image('USGS/SRTMGL1_003').clip(biharState).rename('elevation');

// B. Roads (Human Factor)
var majorRoads = roadsSEA.merge(roadsMECA).filterBounds(biharState);

// Create Distance to Road raster (max 10km)
var distToRoad = majorRoads.distance(10000).clip(biharState).rename('distRoad');

// 3. LOAD DYNAMIC WORLD LULC (Remapped to 5 Classes)
var getLULC = function(year) {
  var startDate = year + '-01-01';
  var endDate = year + '-12-31';
  
  var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterBounds(biharState)
    .filterDate(startDate, endDate)
    .select('label')
    .mode()
    .clip(biharState);
    
  // 0=Water, 1=Trees, 2=Crops, 3=Built, 4=Bare
  var fromClasses = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  var toClasses   = [0, 1, 1, 0, 2, 1, 3, 4, 0]; 
  
  return dw.remap(fromClasses, toClasses);
};

var lulc2016 = getLULC(2016);
var lulc2025 = getLULC(2025);

// C. Distance to Water (Environmental Factor)
var isWater2016 = lulc2016.eq(0);
var waterAsZero = isWater2016.not(); 
// OPTIMIZATION: Multiply by pixelArea square root to dynamically adjust to scale safely
var distToWater = waterAsZero.fastDistanceTransform(256)
  .multiply(ee.Image.pixelArea().sqrt()) 
  .clip(biharState)
  .rename('distWater');

// ==============================================================================
// 4. ISOLATE HOTSPOT TYPES (Filtering Noise & Water)
// ==============================================================================

// Find all pixels that changed their class
var anyChange = lulc2016.neq(lulc2025);

// Identify noise (Class 1 <-> Class 2 confusion)
var cropToTree = lulc2016.eq(2).and(lulc2025.eq(1));
var treeToCrop = lulc2016.eq(1).and(lulc2025.eq(2));
var noiseMask = cropToTree.or(treeToCrop);

// Identify specific transition types
// *NEW* Anything to Built-up (Was NOT 3 in 2016, IS 3 in 2025)
var anythingToBuilt = lulc2016.neq(3).and(lulc2025.eq(3)); 
var waterChange = lulc2016.eq(0).neq(lulc2025.eq(0)); // Water <-> Land

// Master Valid Mask: It IS a change, and it is NOT noise.
var validHotspot = anyChange.and(noiseMask.not());

// Apply User Toggle to filter out water shifts if requested
if (EXCLUDE_WATER_TRANSITIONS) {
  validHotspot = validHotspot.and(waterChange.not());
}

// Find "Other" valid changes 
var otherChange = validHotspot.and(anythingToBuilt.not()).and(waterChange.not());


// ==============================================================================
// *NEW*: EXTRACT & PRINT COORDINATES OF 'ANYTHING TO BUILT'
// ==============================================================================
var samplePoints = anythingToBuilt.selfMask().sample({
  region: biharState.geometry(),
  scale: 100, // 100m scale just to find some accurate points quickly
  numPixels: 5, // Grab 5 random points
  geometries: true // Force it to return the Lat/Long
});

print("Sample Coordinates [Anything -> Built-up]:", samplePoints);


// ==============================================================================
// 5. CREATE DENSITY HEAT MAPS & ADD TO MAP
// ==============================================================================

// Elevation: Green (Flat) -> White (Medium) -> Orange (High)
Map.addLayer(elevation, {min: 30, max: 80, palette: ['008000', 'ffffff', 'ff8c00']}, '1. Terrain/Elevation (Background)', true, 0.6);
Map.addLayer(majorRoads, {color: 'black'}, '2. Major Roads', false, 0.5);

// Bihar Boundary (Empty fill, black outline)
var empty = ee.Image().byte();
var outline = empty.paint({featureCollection: biharState, color: 1, width: 2});
Map.addLayer(outline, {palette: ['000000']}, 'Bihar State Boundary', true);

// Generate Heatmaps (Density over 5km radius)
var calcHeatmap = function(maskLayer) {
  return maskLayer.multiply(1).focal_mean({radius: 5000, units: 'meters'}).selfMask();
};

if (!EXCLUDE_WATER_TRANSITIONS) {
  Map.addLayer(calcHeatmap(waterChange), {min: 0.001, max: 0.05, palette: ['#e6f2ff', '#4d94ff', '#0000ff']}, 'Heatmap: Hydrological Shifts (Blue)', true, 0.8);
}

Map.addLayer(calcHeatmap(otherChange), {min: 0.001, max: 0.05, palette: ['#f9e6ff', '#bf40ff', '#800080']}, 'Heatmap: Other Valid Changes (Purple)', false, 0.8);
Map.addLayer(calcHeatmap(anythingToBuilt), {min: 0.001, max: 0.05, palette: ['#ffe6e6', '#ff4d4d', '#ff0000']}, 'Heatmap: Urbanization (Red)', true, 0.9);


// ==============================================================================
// 6. CALCULATE COMPREHENSIVE STATISTICS (MEMORY OPTIMIZED)
// ==============================================================================

var analysisStack = ee.Image.cat([elevation, distToRoad, distToWater]);

var multiReducer = ee.Reducer.mean()
  .combine(ee.Reducer.median(), '', true)
  .combine(ee.Reducer.minMax(), '', true)
  .combine(ee.Reducer.stdDev(), '', true);

var getStatsForMask = function(maskLayer, typeName) {
  var maskedStack = analysisStack.updateMask(maskLayer);
  
  var stats = maskedStack.reduceRegion({
    reducer: multiReducer,
    geometry: biharState.geometry(),
    scale: 1000,      // OPTIMIZATION: 1000m scale prevents crashing and export hangs!
    tileScale: 16,   
    maxPixels: 1e13
  });

  return ee.Feature(null, {
    'Hotspot_Type': typeName,
    'Elev_Mean_m': stats.getNumber('elevation_mean'),
    'Elev_Median_m': stats.getNumber('elevation_median'),
    'Elev_StdDev_m': stats.getNumber('elevation_stdDev'),
    'DistRoad_Mean_m': stats.getNumber('distRoad_mean'),
    'DistRoad_Median_m': stats.getNumber('distRoad_median'),
    'DistRoad_StdDev_m': stats.getNumber('distRoad_stdDev'),
    'DistWater_Mean_m': stats.getNumber('distWater_mean'),
    'DistWater_Median_m': stats.getNumber('distWater_median'),
    'DistWater_StdDev_m': stats.getNumber('distWater_stdDev')
  });
};

// We only construct the features for EXPORT. 
// We NO LONGER print them to the console. Printing them forces synchronous processing and causes timeouts.
var urbanFeature = getStatsForMask(anythingToBuilt, 'Urbanization (Anything to Built)');
var otherFeature = getStatsForMask(otherChange, 'Other Valid Transitions');

var featuresArray = [urbanFeature, otherFeature];
if (!EXCLUDE_WATER_TRANSITIONS) {
  featuresArray.push(getStatsForMask(waterChange, 'Hydrological Volatility (Water Shifts)'));
}

var finalStatsCollection = ee.FeatureCollection(featuresArray);
print("Your Tasks are ready. Go to the Tasks tab to export the CSVs!");

// ==============================================================================
// 7. EXPORT TO GOOGLE DRIVE
// ==============================================================================

Export.table.toDrive({
  collection: finalStatsCollection,
  description: 'Bihar_Master_Hotspot_Road_CSV',
  folder: 'issat_project',
  fileNamePrefix: 'Bihar_Road_Hotspot',
  fileFormat: 'CSV',
  selectors: ['Hotspot_Type', 'DistRoad_Mean_m', 'DistRoad_Median_m', 'DistRoad_StdDev_m']
});

Export.table.toDrive({
  collection: finalStatsCollection,
  description: 'Bihar_Master_Hotspot_Elevation_CSV',
  folder: 'issat_project',
  fileNamePrefix: 'Bihar_Elevation_Hotspot',
  fileFormat: 'CSV',
  selectors: ['Hotspot_Type', 'Elev_Mean_m', 'Elev_Median_m', 'Elev_StdDev_m']
});

Export.table.toDrive({
  collection: finalStatsCollection,
  description: 'Bihar_Master_Hotspot_Water_CSV',
  folder: 'issat_project',
  fileNamePrefix: 'Bihar_Water_Hotspot',
  fileFormat: 'CSV',
  selectors: ['Hotspot_Type', 'DistWater_Mean_m', 'DistWater_Median_m', 'DistWater_StdDev_m']
});