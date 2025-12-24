import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const WebViewScreen = () => {
    console.log('🌐 WebViewScreen: Component rendering...');
    const webViewRef = React.useRef(null);
    const [canGoBack, setCanGoBack] = React.useState(false);

    React.useEffect(() => {
        const onBackPress = () => {
            if (canGoBack && webViewRef.current) {
                webViewRef.current.goBack();
                return true; // Prevent default behavior (exit app)
            }
            return false; // Exit app
        };

        const backHandler = import('react-native').then(({ BackHandler }) => {
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return subscription;
        });

        return () => {
            backHandler.then(subscription => subscription.remove());
        };
    }, [canGoBack]);

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                source={{ uri: 'https://testing-mu-brown-83.vercel.app' }}
                style={styles.webview}
                startInLoadingState={true}
                domStorageEnabled={true}
                javaScriptEnabled={true}
                allowsBackForwardNavigationGestures={true}
                onNavigationStateChange={(navState) => {
                    setCanGoBack(navState.canGoBack);
                }}
                onLoadStart={() => console.log('🔄 WebView: Loading started')}
                onLoad={() => console.log('✅ WebView: Page loaded successfully')}
                onLoadEnd={() => console.log('🏁 WebView: Loading ended')}
                onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('❌ WebView error:', nativeEvent);
                }}
                onHttpError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('❌ WebView HTTP error:', nativeEvent);
                }}
                renderLoading={() => (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#0000ff" />
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    loading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
});

export default WebViewScreen;
