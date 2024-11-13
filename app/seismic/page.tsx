'use client'
import React, { useRef, useEffect, useState } from 'react';

export default function Seismic() {
    async function fetchSeismicData() {
        // Set current time and calculate startTime as 5 seconds before current time
        const currentTime = new Date();
        const endTime = currentTime.toISOString();
        const startTime = new Date(currentTime.getTime() - 5000).toISOString();

        const API_ENDPOINT = `https://geofon.gfz-potsdam.de/fdsnws/dataselect/1/query?starttime=${encodeURIComponent(startTime)}&endtime=${encodeURIComponent(endTime)}&station=BKNI&nodata=404`;

        try {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            parseMseedData(arrayBuffer);
        } catch (error) {
            console.error("Failed to fetch MiniSEED data:", error);
        }
    }

    function parseMseedData(arrayBuffer) {
        const dataView = new DataView(arrayBuffer);

        const mseedHeader = {
            sequenceNumber: getString(dataView, 0, 6),
            dataQuality: String.fromCharCode(dataView.getUint8(6)),
            reservedByte: dataView.getUint8(7),
            stationIdentifier: getString(dataView, 8, 5),
            locationIdentifier: getString(dataView, 13, 2),
            channelIdentifier: getString(dataView, 15, 3),
            networkCode: getString(dataView, 18, 2),
            recordStartTime: parseTimestamp(dataView, 20),
            numberOfSamples: dataView.getUint16(30, false),
            sampleRateFactor: dataView.getInt16(32, false),
            sampleRateMultiplier: dataView.getInt16(34, false),
            activityFlags: dataView.getUint8(36),
            ioClockFlags: dataView.getUint8(37),
            dataQualityFlags: dataView.getUint8(38),
            numberOfBlockettes: dataView.getUint8(39),
            timeCorrection: dataView.getInt32(40, false),
            dataOffset: dataView.getUint16(44, false),
            blocketteOffset: dataView.getUint16(46, false)
        };

        if (mseedHeader.dataOffset > 0) {
            const sampleDataOffset = mseedHeader.dataOffset;
            const numberOfSamples = mseedHeader.numberOfSamples;
            const maxSamples = (arrayBuffer.byteLength - sampleDataOffset) / 2;
            const validSamplesCount = Math.min(numberOfSamples, maxSamples);
            const samples = [];

            for (let i = 0; i < validSamplesCount; i++) {
                const sample = dataView.getInt16(sampleDataOffset + i * 2, false);
                samples.push(sample);
            }

            drawSeismicGraph(samples);
        } else {
            console.log("No sample data found.");
        }
    }

    function getString(dataView, start, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            str += String.fromCharCode(dataView.getUint8(start + i));
        }
        return str.trim();
    }

    function parseTimestamp(dataView, offset) {
        const year = dataView.getUint16(offset, false);
        const day = dataView.getUint16(offset + 2, false);
        const hour = dataView.getUint8(offset + 4);
        const minute = dataView.getUint8(offset + 5);
        const second = dataView.getUint8(offset + 6);
        const fracSec = dataView.getUint16(offset + 7, false);

        return new Date(Date.UTC(year, 0, day, hour, minute, second, fracSec / 10));
    }

    function drawSeismicGraph(samples) {
        const canvas = document.getElementById("seismicCanvas");
        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        // Shift the canvas to the left before drawing new samples
        const scrollAmount = 5; // Amount to shift, adjust as needed
        ctx.clearRect(0, 0, scrollAmount, height); // Clear the area where new samples will be drawn
        ctx.drawImage(canvas, scrollAmount, 0); // Shift old waveform data to the left

        // Scaling factors
        const maxAmplitude = Math.max(...samples.map(Math.abs));
        const xScale = width / samples.length;
        const yScale = (height / 2) / maxAmplitude;

        // Draw the new samples on the right edge
        ctx.beginPath();
        const startX = width - samples.length * xScale;
        samples.forEach((sample, i) => {
            const x = startX + i * xScale;
            const y = height / 2 - sample * yScale;
            ctx.lineTo(x, y);
        });

        ctx.strokeStyle = "#007BFF";
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }


    useEffect(() => {
        // Usage: pass a file input element
        setInterval(fetchSeismicData, 5000);


    });
    return (<div>
        <canvas id="seismicCanvas" width="800" height="400" ></canvas>
    </div>);
}