import ExpoModulesCore
import FamilyControls
import ManagedSettings

/// Applies SafeNest website rules through Apple's Screen Time APIs.
///
/// Requires the com.apple.developer.family-controls entitlement, which Apple
/// grants on request. Authorization is requested for a child in Family
/// Sharing, so a parent approves it on their own device and the child can't
/// remove the app without the parent.
///
/// ManagedSettings blocks domains (and their subdomains) in Safari and
/// WebKit views. It can't express "allow music.youtube.com inside a blocked
/// youtube.com", so JS sends only the domains whose decision is "block".
public class SafeNestScreenTimeModule: Module {
  private let store = ManagedSettingsStore(named: ManagedSettingsStore.Name("safenest"))

  public func definition() -> ModuleDefinition {
    Name("SafeNestScreenTime")

    Function("isAuthorized") { () -> Bool in
      AuthorizationCenter.shared.authorizationStatus == .approved
    }

    AsyncFunction("requestAuthorization") { () async throws -> Bool in
      try await AuthorizationCenter.shared.requestAuthorization(for: .child)
      return AuthorizationCenter.shared.authorizationStatus == .approved
    }

    Function("apply") { (blockedDomains: [String]) in
      let domains = Set(blockedDomains.map { WebDomain(domain: $0) })
      self.store.webContent.blockedByFilter = domains.isEmpty ? nil : .specific(domains)
    }

    Function("clear") {
      self.store.clearAllSettings()
    }

    Function("isActive") { () -> Bool in
      self.store.webContent.blockedByFilter != nil
    }
  }
}
