import { useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

export interface RecordingResult {
  uri: string;
  base64: string;
  mimeType: string;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  hasPermission: boolean | null;
  start: () => Promise<void>;
  stop: () => Promise<RecordingResult | null>;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    // Request mic permission and activate the iOS audio session up front.
    // setAudioModeAsync must complete before createAsync is called —
    // doing it inline right before recording races with iOS session activation
    // and causes "Session activation failed" (NSOSStatusErrorDomain 561017449).
    Audio.requestPermissionsAsync()
      .then(({ granted }) => {
        setHasPermission(granted);
        if (granted) {
          return Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });
        }
      })
      .catch(() => {});

    return () => {
      // Clean up any in-progress recording on unmount
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const start = async () => {
    if (!hasPermission || isRecording) return;

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );

    recordingRef.current = recording;
    setIsRecording(true);
  };

  const stop = async (): Promise<RecordingResult | null> => {
    if (!recordingRef.current) return null;

    await recordingRef.current.stopAndUnloadAsync();

    // Restore playback mode so Zoey's response audio plays correctly
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    const uri = recordingRef.current.getURI();
    recordingRef.current = null;
    setIsRecording(false);

    if (!uri) return null;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { uri, base64, mimeType: "audio/m4a" };
  };

  return { isRecording, hasPermission, start, stop };
}
