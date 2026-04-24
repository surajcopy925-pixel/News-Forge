import React from 'react';

interface Props {
  timecode: string;
  playing: boolean;
  paused: boolean;
}

export default function TimecodeDisplay({ timecode, playing, paused }: Props) {
  const className = paused ? 'channel-timecode paused' : playing ? 'channel-timecode' : 'channel-timecode stopped';
  return <div className={className}>{timecode}</div>;
}
