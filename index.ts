// Register background SOS task before the router loads, so headless (screen-off) runs find it.
import './src/services/sos';
import 'expo-router/entry';
