const { readFileSync, writeFileSync } = require('fs')
const turf = require('@turf/turf')

// Load the GeoJSON data
function main() {
    const data = JSON.parse(readFileSync('./public/geojson/batas_wilayah.geojson', 'utf8'))
    let results : any = []
    for (let i = 0; i < data.features.length; i++) {
        const feature = data.features[i]
        const poly1 = turf.feature(feature.geometry)
        for (let x = 0; x < data.features.length; x++) {
            if (i != x){
                const d = data.features[x]
                //get all features except feature
                const features = data.features.filter((f, index) => index !== i)
                
                // const poly2 = turf.union(...features.map(f => turf.multiLineString(f.geometry.coordinates)))
                const poly2 = turf.feature(d.geometry)
                var overlaping = turf.lineOverlap(poly1, poly2);
                if(overlaping){
   

                    if(overlaping.features.length > 0){
                        for (let i = 0; i < overlaping.features.length; i++) {
                            results.push(overlaping.features[i])
                        }
                    }
                }
            }
            
        }
        

    }
    const overlapResult = turf.featureCollection(results)
    //remove overlapping coordinates from original data
    // for (let i = 0; i < overlapResult.features.length; i++) {
    //     const element = overlapResult.features[i];
    //     const index = data.features.findIndex((f: any) => f.geometry.coordinates === element.geometry.coordinates)
    //     if(index > -1){
    //         data.features.splice(index, 1)
    //     }
    // }
    


    writeFileSync('./public/geojson/garis_pantai.geojson', JSON.stringify(overlapResult))
}

main();