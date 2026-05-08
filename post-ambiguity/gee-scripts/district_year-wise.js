// Note, reused for all yearwise charts with district name changed

// 1. Isolate Vaishali District
var Vaishali = table.filter(ee.Filter.eq('District', 'Vaishali')); // Confirm column name
Map.centerObject(Vaishali, 10);
Map.addLayer(Vaishali.style({fillColor: '00000000', color: 'black'}), {}, 'Vaishali Boundary');

// 2. Setup Year Iteration and Display Rules
var years = ee.List.sequence(2016, 2025);

// [CHANGED] Added Dynamic World class 7 (Bare) mapping to custom class 4
var classRemap = {from: [0, 1, 4, 6, 7], to: [0, 1, 2, 3, 4]};

// [CHANGED] max updated to 4, added 'brown' color for the Bare class
var labelVis = {min: 0, max: 4, palette: ['blue', 'darkgreen', 'yellow', 'red', 'brown']};

// 3. Function to Extract LULC for Any Given Year
var getYearlyLULC = function(year) {
  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = ee.Date.fromYMD(year, 12, 31);
  
  var dwMode = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterBounds(Vaishali)
    .filterDate(startDate, endDate)
    .select('label')
    .mode()
    .clip(Vaishali);
    
  // [CHANGED] Added .or(dwMode.eq(7)) to mask out everything except our 5 target classes
  var masked = dwMode.updateMask(
    dwMode.eq(0).or(dwMode.eq(1)).or(dwMode.eq(4)).or(dwMode.eq(6)).or(dwMode.eq(7))
  );
  
  var remapped = masked.remap(classRemap.from, classRemap.to).rename('class');
  
  return remapped.set('year', year).set('system:time_start', startDate.millis());
};

// 4. Generate Year-Wise Image Collection
var yearlyLULC_Col = ee.ImageCollection(years.map(getYearlyLULC));

// Step 8: Calculate Area per Class for Every Year
var calculateYearlyArea = function(img) {
  var year = img.get('year');
  
  // [CHANGED] Divide pixelArea by 1,000,000 to output strictly in Square Kilometers
  var areaImage = ee.Image.pixelArea().divide(1e6).addBands(img.select('class'));
  
  // Group the area sums by class for Vaishali
  var stats = areaImage.reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'class'
    }),
    geometry: Vaishali.geometry(),
    scale: 100, // 100m is fine for district-level computation
    maxPixels: 1e10
  });
  
  // Return the data as a Feature (Geometry is null since we only need the table)
  return ee.Feature(null, {
    'Year': year,
    'groups': stats.get('groups')
  });
};

// Map the area calculation over the 10-year collection
var VaishaliYearlyStats = ee.FeatureCollection(yearlyLULC_Col.map(calculateYearlyArea));

// Print to console to verify
print('Vaishali Yearly Statistics (sq km):', VaishaliYearlyStats);

// Export to Google Drive as CSV
Export.table.toDrive({
  collection: VaishaliYearlyStats,
  description: 'Vaishali_LULC_2016_2025_Yearly',
  folder: 'issat_project', // Optional: Specify a folder in your Drive
  fileFormat: 'CSV'
});

// 5. Measure 2016 to 2025 Transitions
var img2016 = ee.Image(yearlyLULC_Col.filter(ee.Filter.eq('year', 2016)).first());
var img2025 = ee.Image(yearlyLULC_Col.filter(ee.Filter.eq('year', 2025)).first());

var transition_16_25 = img2016.multiply(10).add(img2025).rename('transition_class');

// [CHANGED] Converted Transition Matrix area directly into Square Kilometers
var transitionArea = ee.Image.pixelArea().divide(1e6).addBands(transition_16_25).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'transition_class'}),
  geometry: Vaishali.geometry(),
  scale: 100, // Reduced scale to prevent interactive timeout
  maxPixels: 1e10
});

print('Vaishali Transition Matrix (2016 -> 2025 in sq km):', transitionArea.get('groups'));

// 6. Display Major Features (Spatial Change Mapping)
var changedPixels = img2016.neq(img2025);
var changeMap = transition_16_25.updateMask(changedPixels);

Map.addLayer(img2016, labelVis, 'Vaishali 2016', false);
Map.addLayer(img2025, labelVis, 'Vaishali 2025', false);
Map.addLayer(changeMap.randomVisualizer(), {}, 'Major Transitions (Random Colors)');

// 7. Chart Time-Series for Gradual vs Abrupt Analysis
var createClassBands = function(img) {
  // [CHANGED] Converted chart calculations to sq km and added "Bare" as img.eq(4)
  var water = img.eq(0).multiply(ee.Image.pixelArea().divide(1e6)).rename('Water');
  var trees = img.eq(1).multiply(ee.Image.pixelArea().divide(1e6)).rename('Trees');
  var crops = img.eq(2).multiply(ee.Image.pixelArea().divide(1e6)).rename('Crops');
  var built = img.eq(3).multiply(ee.Image.pixelArea().divide(1e6)).rename('Built');
  var bare  = img.eq(4).multiply(ee.Image.pixelArea().divide(1e6)).rename('Bare');
  return img.addBands([water, trees, crops, built, bare]);
};

// [CHANGED] Included 'Bare' in the bands selection array
var chartCol = yearlyLULC_Col.map(createClassBands).select(['Water', 'Trees', 'Crops', 'Built', 'Bare']);

var areaChart = ui.Chart.image.series({
  imageCollection: chartCol,
  region: Vaishali.geometry(),
  reducer: ee.Reducer.sum(),
  scale: 100, 
  xProperty: 'year'
}).setOptions({
  title: 'Vaishali Year-Wise LULC Area (2016-2025)',
  vAxis: {title: 'Area (Square Kilometers)'}, // [CHANGED] Updated Title
  hAxis: {title: 'Year', format: '####'},
  colors: ['blue', 'darkgreen', 'gold', 'red', 'brown'] // [CHANGED] Added 'brown' for Bare
});

print(areaChart);