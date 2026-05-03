export const ExtensionAdapter={mode:'extension',applyAnalysis:(app,payload)=>app.state.setTextures(payload.textures,payload.confidence??1)};
