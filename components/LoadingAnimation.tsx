"use client"

import React, { useState, useEffect } from 'react';

const LoadingAnimation = () => {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
      <div className="animate-bounce text-6xl">🥐</div>
      <p className="mt-4 text-xl font-semibold text-gray-700">Loading croissants...</p>
    </div>
  );
};

export default LoadingAnimation; 