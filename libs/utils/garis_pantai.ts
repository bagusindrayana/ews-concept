const { readFileSync, writeFileSync } = require('fs')
const turf = require('@turf/turf')

// Load the GeoJSON data
const data = JSON.parse(readFileSync('./public/geojson/batas_wilayah.geojson', 'utf8'))
const overlapingData = JSON.parse(readFileSync('./public/geojson/overlaping_data.geojson', 'utf8'))
function checkDuplicateDate(coordinate) {
    for (let i = 0; i < overlapingData.features.length; i++) {
        const feature = overlapingData.features[i];
        if(feature.geometry.type == "LineString"){
            for (let x = 0; x < feature.geometry.coordinates.length; x++) {
                const c = feature.geometry.coordinates[x];
                if(c[0] == coordinate[0]){
                    return true;
                }
                
            }
        }
        
    }
    return false;
}




//remove overlapping coordinates from original data
for (let i = 0; i < data.features.length; i++) {
    const oFeature = data.features[i];
    if(oFeature.geometry.type == "LineString"){
        for (let x = 0; x < oFeature.geometry.coordinates.length; x++) {
            const oCoordinate = oFeature.geometry.coordinates[x];
            if(checkDuplicateDate(oCoordinate)){
                data.features[i].geometry.coordinates.splice(x, 1);
                console.log("remove");
            }
        }
    }
    
}



writeFileSync('./public/geojson/garis_pantai.geojson', JSON.stringify(data))