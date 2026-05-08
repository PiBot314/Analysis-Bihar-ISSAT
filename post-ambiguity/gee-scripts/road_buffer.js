// again changed to match year for each dataset

// 1. Define Area of Interest (State Level: Bihar)
var biharState = table.filter(ee.Filter.eq('State', 'BR'));

// 2. Load OpenStreetMap Roads 
// (Using the community OSM dataset available directly in GEE)
var roadsSEA = ee.FeatureCollection("projects/sat-io/open-datasets/GRIP4/South-East-Asia");
var roadsMECA = ee.FeatureCollection("projects/sat-io/open-datasets/GRIP4/Middle-East-Central-Asia");
var roads = roadsSEA.filterBounds(biharState).merge(roadsMECA).filterBounds(biharState);

// 3. The Raster Hack: Calculate Distance to Nearest Road
// We ask GEE to create a raster representing distance to roads (up to 5000 meters)
var distanceToRoad = roads.distance(5000).clip(biharState);

// 4. Create the Requested Zones using Image thresholds (Raster Math)
// Requirement 1: Road network cumulative buffers (1 and 2 km)
var buffer1km = distanceToRoad.lte(1000); // 0 to 1 km
var buffer2km = distanceToRoad.lte(2000); // 0 to 2 km

// Requirement 2: Multi-ring discrete buffers (1, 3, and 5 km)
var ring1km = distanceToRoad.lte(1000);                              // 0 to 1 km
var ring3km = distanceToRoad.gt(1000).and(distanceToRoad.lte(3000)); // 1 to 3 km
var ring5km = distanceToRoad.gt(3000).and(distanceToRoad.lte(5000)); // 3 to 5 km

// Add rings to map for visual confirmation
Map.centerObject(biharState, 7);
Map.addLayer(ring1km.selfMask(), {palette: ['red']}, 'Multi-Ring: 0-1 km');
Map.addLayer(ring3km.selfMask(), {palette: ['orange']}, 'Multi-Ring: 1-3 km');
Map.addLayer(ring5km.selfMask(), {palette: ['yellow']}, 'Multi-Ring: 3-5 km');

// 5. Load Dynamic World for Land Cover Analysis (e.g., Year 2025)
var dwComposite = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
  .filterBounds(biharState)
  .filterDate('2016-01-01', '2016-12-31')
  .select('label')
  .mode()
  .clip(biharState);

// Isolate Built Area (Class 6 in DW)
var builtArea = dwComposite.eq(6);

// 6. Function to Calculate Built-up % in a specific zone
var calculateBuiltUpPercent = function(zoneImage, zoneName) {
  // Mask the built area to only exist within our target zone
  var builtInZone = builtArea.updateMask(zoneImage);
  
  // Calculate area of built-up land in the zone
  var builtAreaSqm = builtInZone.multiply(ee.Image.pixelArea())
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: biharState.geometry(),
      scale: 10,
      maxPixels: 1e13
    }).getNumber('label');
    
  // Calculate total area of the zone
  var totalZoneAreaSqm = zoneImage.multiply(ee.Image.pixelArea())
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: biharState.geometry(),
      scale: 10,
      maxPixels: 1e13
    }).getNumber('distance'); // Band name from distance calculation

  // Calculate percentage
  var percentBuilt = builtAreaSqm.divide(totalZoneAreaSqm).multiply(100);
  
  return ee.Feature(null, {
    'Zone': zoneName,
    'Built_Area_Sqm': builtAreaSqm,
    'Total_Zone_Area_Sqm': totalZoneAreaSqm,
    'Built_Up_Percent': percentBuilt
  });
};

// 7. Run Calculations and Print Results
var statsCollection = ee.FeatureCollection([
  calculateBuiltUpPercent(buffer1km, 'Cumulative Buffer: 0-1 km'),
  calculateBuiltUpPercent(buffer2km, 'Cumulative Buffer: 0-2 km'),
  calculateBuiltUpPercent(ring1km, 'Multi-ring: 0-1 km'),
  calculateBuiltUpPercent(ring3km, 'Multi-ring: 1-3 km'),
  calculateBuiltUpPercent(ring5km, 'Multi-ring: 3-5 km')
]);

print('Urban Expansion Distance Gradients:', statsCollection);

Export.table.toDrive({
  collection: statsCollection,
  description: 'V2_Bihar_Urban_Gradient_2020', // Name of the export task
  folder: 'issat_project',            // Folder created in your Drive
  fileNamePrefix: 'V2_Bihar_Urban_Gradient_2020',
  fileFormat: 'CSV',
  selectors: ['Zone', 'Built_Area_Sqm', 'Total_Zone_Area_Sqm', 'Built_Up_Percent'] 
});