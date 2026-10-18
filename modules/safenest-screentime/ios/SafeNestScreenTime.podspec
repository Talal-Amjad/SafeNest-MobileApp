Pod::Spec.new do |s|
  s.name           = 'SafeNestScreenTime'
  s.version        = '0.1.0'
  s.summary        = 'Applies SafeNest website rules with Apple Screen Time (FamilyControls, ManagedSettings).'
  s.homepage       = 'https://safenest.app'
  s.license        = { :type => 'Proprietary' }
  s.author         = 'SafeNest'
  s.source         = { :git => '' }
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'FamilyControls', 'ManagedSettings'
  s.source_files   = '**/*.swift'
end
