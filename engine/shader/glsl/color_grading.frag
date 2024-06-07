#version 310 es

#extension GL_GOOGLE_include_directive : enable

#include "constants.h"

layout(input_attachment_index = 0, set = 0, binding = 0) uniform highp subpassInput in_color;
layout(set = 0, binding = 1) uniform sampler2D color_grading_lut_texture_sampler;
layout(location = 0) out highp vec4 out_color;

highp vec3 getFloorCeilRatio(highp float value, highp float lutSize, highp float unitSize){
    highp float scaleValue = value * lutSize;
    highp float floorValue = floor(scaleValue);
    highp float ceilValue = ceil(scaleValue);
    return vec3(floorValue * unitSize, ceilValue * unitSize, scaleValue - floorValue);
}

highp vec3 getLutColor(highp float u, highp float v, highp float uOffset){
    return texture(color_grading_lut_texture_sampler, vec2(uOffset+u, v) ).rgb;
}

highp vec3 lerpRG(highp vec3 u, highp vec3 v, highp float uOffset){
    return mix(
        mix(getLutColor(u.x, v.x, uOffset), getLutColor(u.y, v.x, uOffset), u.z), // rl_gl mix rh_gl
        mix(getLutColor(u.x, v.y, uOffset), getLutColor(u.y, v.y, uOffset), u.z), // rl_gh mix rh_gh
        v.z
    );
}

void main()
{
    highp ivec2 lut_tex_size = textureSize(color_grading_lut_texture_sampler, 0);
    highp float _WIDTH       = float(lut_tex_size.x); // 256
    highp float _COLORS      = float(lut_tex_size.y); // 16
    highp float _COLORS_1    = _COLORS - 1.0; // 15
    highp vec4 color       = clamp( subpassLoad(in_color).rgba, vec4(0.0), vec4(1.0) );
    
    highp vec3 r = getFloorCeilRatio(color.r, _COLORS_1, 1.0 / _WIDTH);
    highp vec3 g = getFloorCeilRatio(color.g, _COLORS_1, 1.0 / _COLORS);
    highp vec3 b = getFloorCeilRatio(color.b, _COLORS_1, 1.0 / _COLORS);
    
    highp vec3 bl = lerpRG(r, g, b.x);
    highp vec3 bh = lerpRG(r, g, b.y);
    
    highp vec3 bmix = mix( bl, bh, b.z );
    out_color = vec4(bmix, 1.0 );
}