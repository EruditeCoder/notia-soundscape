import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import Pitchfinder from 'pitchfinder';

const Recorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [detectedPitch, setDetectedPitch] = useState<number | null>(null);
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const graphRef = useRef<SVGSVGElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const hzData = useRef<number[]>([]);

  const detectPitch = Pitchfinder.ACF2PLUS({ sampleRate: 44100 });

  useEffect(() => {
    if (graphRef.current) {
      createGraph();
    }
  }, []);

  const createGraph = () => {
    const svg = d3.select(graphRef.current);
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, 100]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 2000]).range([height, 0]);

    const line = d3.line<number>()
      .x((d: any, i: any) => x(i))
      .y((d: any) => y(d));

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .append('path')
      .datum(hzData.current)
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', 'blue')
      .attr('stroke-width', 1.5)
      .attr('d', line);

    svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top + height})`)
      .call(d3.axisBottom(x));

    svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .call(d3.axisLeft(y));
  };

  const updateGraph = (newHz: number) => {
    const svg = d3.select(graphRef.current);
    const width = 800;
    const height = 200;

    hzData.current.push(newHz);
    if (hzData.current.length > 100) hzData.current.shift(); // Keep last 100 data points

    const x = d3.scaleLinear().domain([0, 100]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 2000]).range([height, 0]);

    const line = d3.line<number>()
      .x((d: any, i: any) => x(i))
      .y((d: any) => y(d));

    svg.select('.line').datum(hzData.current).attr('d', line);
  };

  const startRecording = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    await audioContextRef.current.audioWorklet.addModule('/js/pitchProcessor.bundle.js');
    workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pitch-processor');

    workletNodeRef.current.port.onmessage = (event) => {
      const audioData = event.data;
      const pitch = detectPitch(audioData);

      if (pitch !== null) {
        setDetectedPitch(pitch);
        const note = frequencyToNoteName(pitch);
        setDetectedNote(note);
        updateGraph(pitch);
      }
    };

    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(workletNodeRef.current);
    workletNodeRef.current.connect(audioContextRef.current.destination);

    setIsRecording(true);
  };

  const stopRecording = () => {
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }

    setIsRecording(false);
  };

  const frequencyToNoteName = (frequency: number): string => {
    const noteNames = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
    const A4 = 440;
    const semitonesAwayFromA4 = 12 * Math.log2(frequency / A4);
    const noteIndex = Math.round(semitonesAwayFromA4) + 9;
    let octave = 4 + Math.floor(noteIndex / 12);
    let normalizedNoteIndex = noteIndex % 12;
    if (normalizedNoteIndex < 0) {
      normalizedNoteIndex += 12;
      octave -= 1;
    }
    return `${noteNames[normalizedNoteIndex]}${octave}`;
  };

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording]);

  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      <svg ref={graphRef} width="800" height="200"></svg>

      {detectedPitch && (
        <div>
          <h3>Detected Pitch: {detectedPitch.toFixed(2)} Hz</h3>
        </div>
      )}

      {detectedNote && (
        <div>
          <h3>Detected Note: {detectedNote}</h3>
        </div>
      )}
    </div>
  );
};

export default Recorder;
