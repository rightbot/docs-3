---
title: Configuring SAML single sign-on for Enterprise Managed Users
shortTitle: SAML for managed users
intro: 'You can automatically manage access to your enterprise account on {% data variables.product.prodname_dotcom %} by configuring Security Assertion Markup Language (SAML) single sign-on (SSO).'
product: '{% data reusables.gated-features.emus %}'
redirect_from:
  - /github/setting-up-and-managing-your-enterprise/managing-your-enterprise-users-with-your-identity-provider/configuring-saml-single-sign-on-for-enterprise-managed-users
  - /admin/authentication/managing-your-enterprise-users-with-your-identity-provider/configuring-saml-single-sign-on-for-enterprise-managed-users
  - /admin/identity-and-access-management/managing-iam-with-enterprise-managed-users/configuring-saml-single-sign-on-for-enterprise-managed-users
  - /admin/identity-and-access-management/using-enterprise-managed-users-and-saml-for-iam/configuring-saml-single-sign-on-for-enterprise-managed-users
versions:
  ghec: '*'
type: tutorial
topics:
  - Authentication
  - Enterprise
  - SSO
---

## About SAML single sign-on for {% data variables.product.prodname_emus %}

With {% data variables.product.prodname_emus %}, your enterprise uses your corporate identity provider to authenticate all members. Instead of signing in to {% data variables.product.prodname_dotcom %} with a {% data variables.product.prodname_dotcom %} username and password, members of your enterprise will sign in through your IdP.

{% data variables.product.prodname_emus %} supports the following IdPs:

{% data reusables.enterprise-accounts.emu-supported-idps %}

After you configure SAML SSO, we recommend storing your recovery codes so you can recover access to your enterprise in the event that your identity provider is unavailable.


{% data reusables.enterprise_user_management.SAML-to-OIDC-migration-for-EMU %}

{% note %}

**Note:** When SAML SSO is enabled, the only setting you can update on {% data variables.product.prodname_dotcom %} for your existing SAML configuration is the SAML certificate. If you need to update the Sign on URL or Issuer, you must first disable SAML SSO and then reconfigure SAML SSO with the new settings.

{% endnote %}

## Configuring SAML single sign-on for {% data variables.product.prodname_emus %}

To configure SAML SSO for your {% data variables.enterprise.prodname_emu_enterprise %}, you must configure an application on your IdP and then configure your enterprise on GitHub.com. After you configure SAML SSO, you can configure user provisioning.

To install and configure the {% data variables.product.prodname_emu_idp_application %} application on your IdP, you must have a tenant and administrative access on a supported IdP.

{% note %}

{% data reusables.enterprise-accounts.emu-password-reset-session %}

{% endnote %}

1. [Configuring your identity provider](#configuring-your-identity-provider)
2. [Configuring your enterprise](#configuring-your-enterprise)
3. [Enabling provisioning](#enabling-provisioning)

### Configuring your identity provider

To configure your IdP, follow the instructions they provide for configuring the {% data variables.product.prodname_emu_idp_application %} application on your IdP.

1. To install the {% data variables.product.prodname_emu_idp_application %} application, click the link for your IdP below:

     - [{% data variables.product.prodname_emu_idp_application %} application on Azure Active Directory](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/aad.githubenterprisemanageduser?tab=Overview)
     - [{% data variables.product.prodname_emu_idp_application %} application on Okta](https://www.okta.com/integrations/github-enterprise-managed-user)

1. To configure the {% data variables.product.prodname_emu_idp_application %} application and your IdP, click the link below and follow the instructions provided by your IdP:

     - [Azure Active Directory tutorial for {% data variables.product.prodname_emus %}](https://docs.microsoft.com/en-us/azure/active-directory/saas-apps/github-enterprise-managed-user-tutorial)
     - [Okta documentation for {% data variables.product.prodname_emus %}](https://saml-doc.okta.com/SAML_Docs/How-to-Configure-SAML-2.0-for-GitHub-Enterprise-Managed-User.html)

1. So you can test and configure your enterprise, assign yourself or the user that will be configuring SAML SSO on {% data variables.product.prodname_dotcom %} to the {% data variables.product.prodname_emu_idp_application %} application on your IdP.

1. To enable you to continue configuring your enterprise on {% data variables.product.prodname_dotcom %}, locate and note the following information from the application you installed on your IdP:

    | Value | Other names | Description |
    | :- | :- | :- |
    | IdP Sign-On URL | Login URL, IdP URL | Application's URL on your IdP |
    | IdP Identifier URL | Issuer | IdP's identifier to service providers for SAML authentication |
    | Signing certificate, Base64-encoded | Public certificate | Public certificate that IdP uses to sign authentication requests |

### Configuring your enterprise

After you install and configure the {% data variables.product.prodname_emu_idp_application %} application on your identity provider, you can configure your enterprise.

1. Sign into {% data variables.product.prodname_dotcom_the_website %} as the setup user for your new enterprise with the username **@<em>SHORT-CODE</em>_admin**.

{% data reusables.enterprise-accounts.access-enterprise %}
{% data reusables.enterprise-accounts.settings-tab %}
{% data reusables.enterprise-accounts.security-tab %}

1. Under "SAML single sign-on", select **Require SAML authentication**.
1. Under **Sign on URL**, type the HTTPS endpoint of your IdP for single sign-on requests that you noted while configuring your IdP.
1. Under **Issuer**, type your SAML issuer URL that you noted while configuring your IdP, to verify the authenticity of sent messages.
1. Under **Public Certificate**, paste the certificate that you noted while configuring your IdP, to verify SAML responses.
{% data reusables.saml.edit-signature-and-digest-methods %}
1. Before enabling SAML SSO for your enterprise, to ensure that the information you've entered is correct, click **Test SAML configuration**.
1. Click **Save**.

    {% note %}

    **Note:** When you require SAML SSO for your enterprise, the setup user will no longer have access to the enterprise but will remain signed in to GitHub. Only {% data variables.enterprise.prodname_managed_users %} provisioned by your IdP will have access to the enterprise.

    {% endnote %}

{% data reusables.enterprise-accounts.download-recovery-codes %}


### Enabling provisioning

After you enable SAML SSO, enable provisioning. For more information, see "[AUTOTITLE](/admin/identity-and-access-management/using-enterprise-managed-users-for-iam/configuring-scim-provisioning-for-enterprise-managed-users)."
