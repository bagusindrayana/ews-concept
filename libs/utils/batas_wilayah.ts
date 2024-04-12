const { readFileSync, writeFileSync } = require('fs')
const turf = require('@turf/turf')

const geojson = JSON.parse(readFileSync('./public/geojson/all_kabkota_ind_reduce.geojson', 'utf8'))
var convertedFeatures : any = [];
for (let i = 0; i < geojson.features.length; i++) {
    const feature = geojson.features[i];
    if(feature.geometry.type == "Polygon"){
        const lines = turf.polygonToLine(feature);
        convertedFeatures.push(lines);
    } else if(feature.geometry.type == "MultiPolygon"){
        const lines = turf.polygonToLine(feature);
        for (let x = 0; x < lines.features.length; x++) {
            const element = lines.features[x];
            convertedFeatures.push(element);
        }
        
    }
    
}

// Flatten the array if needed (to handle multipolygons)
convertedFeatures = convertedFeatures.flat();

// Create a new GeoJSON object with the converted features
var convertedGeoJSON = {
    type: 'FeatureCollection',
    features: convertedFeatures
};

writeFileSync('./public/geojson/batas_wilayah.geojson', JSON.stringify(convertedGeoJSON))
