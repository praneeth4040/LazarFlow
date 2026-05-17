import React, { useRef } from 'react';
import { View, Image, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { PinchGestureHandler, PanGestureHandler, State as GestureState } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const SCREEN_W = Dimensions.get('window').width;

interface ImageZoomModalProps {
    visible: boolean;
    imageUri: string | null;
    imageWidth?: number;
    imageHeight?: number;
    onClose: () => void;
    mPinchRef: React.RefObject<any>;
    mPanRef: React.RefObject<any>;
    mScale: Animated.Value;
    mTransX: Animated.Value;
    mTransY: Animated.Value;
    onPinchGestureEvent: (event: any) => void;
    onPinchHandlerStateChange: (event: any) => void;
    onPanGestureEvent: (event: any) => void;
    onPanHandlerStateChange: (event: any) => void;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
    visible,
    imageUri,
    imageWidth = 1920,
    imageHeight = 1080,
    onClose,
    mPinchRef,
    mPanRef,
    mScale,
    mTransX,
    mTransY,
    onPinchGestureEvent,
    onPinchHandlerStateChange,
    onPanGestureEvent,
    onPanHandlerStateChange,
}) => {
    const aspectRatio = imageWidth && imageHeight ? imageWidth / imageHeight : 16 / 9;

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
            <TouchableOpacity
                onPress={onClose}
                style={{ position: 'absolute', top: 52, right: 16, zIndex: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffffff25', borderWidth: 1, borderColor: '#ffffff30', alignItems: 'center', justifyContent: 'center' }}
            >
                <X size={18} color="#fff" />
            </TouchableOpacity>

            <PinchGestureHandler
                ref={mPinchRef}
                simultaneousHandlers={mPanRef}
                onGestureEvent={onPinchGestureEvent}
                onHandlerStateChange={onPinchHandlerStateChange}
            >
                <Animated.View style={{ flex: 1 }}>
                    <PanGestureHandler
                        ref={mPanRef}
                        simultaneousHandlers={mPinchRef}
                        onGestureEvent={onPanGestureEvent}
                        onHandlerStateChange={onPanHandlerStateChange}
                        minPointers={1}
                        maxPointers={2}
                    >
                        <Animated.View
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: [
                                    { translateX: mTransX },
                                    { translateY: mTransY },
                                    { scale: mScale },
                                ],
                            }}
                        >
                            {imageUri && (
                                <Image
                                    source={{ uri: imageUri }}
                                    style={{
                                        width: SCREEN_W,
                                        aspectRatio: aspectRatio,
                                    }}
                                    resizeMode="contain"
                                />
                            )}
                        </Animated.View>
                    </PanGestureHandler>
                </Animated.View>
            </PinchGestureHandler>
        </GestureHandlerRootView>
    );
};