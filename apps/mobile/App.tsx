import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import './global.css'

const App = () => {
  return (
    <View style={styles.container}>
      <Text className='text-2xl font-bold text-red-900'>Hello World</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default App

