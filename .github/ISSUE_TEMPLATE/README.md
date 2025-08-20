# GitHub Templates Guide

This directory contains comprehensive GitHub issue and pull request templates designed specifically for the Ignite educational platform.

## 📋 Issue Templates

### Available Templates

1. **🐛 Bug Report** (`bug_report.yml`)
   - For reporting bugs or unexpected behavior
   - Includes component selection (Admin/Client/Backend/Android)
   - Severity levels and environment information
   - Auto-applies labels: `bug`, `needs-triage`

2. **✨ Feature Request** (`feature_request.yml`)
   - For suggesting new features or enhancements
   - Impact assessment and user type targeting
   - Technical considerations section
   - Auto-applies labels: `enhancement`, `needs-review`

3. **📚 Documentation Issue** (`documentation.yml`)
   - For documentation problems or improvements
   - Categorized by documentation type and issue type
   - Target audience specification
   - Auto-applies labels: `documentation`, `needs-review`

4. **🔒 Security Issue** (`security.yml`)
   - For responsible security vulnerability reporting
   - Severity levels and vulnerability types
   - Responsible disclosure agreement
   - Auto-applies labels: `security`, `urgent`

5. **⚡ Performance Issue** (`performance.yml`)
   - For reporting performance problems
   - Metrics and profiling data collection
   - Device and environment information
   - Auto-applies labels: `performance`, `needs-investigation`

6. **🛠️ Environment/Setup Issue** (`setup.yml`)
   - For installation and setup problems
   - Detailed environment information
   - Setup stage identification
   - Auto-applies labels: `setup`, `environment`, `needs-help`

### Template Features

- **Component-Specific**: All templates include options for Admin Dashboard, Client App, Backend API, and Android App
- **User-Friendly**: Clear descriptions and helpful placeholders
- **Comprehensive**: Cover all aspects of the MERN stack platform
- **Validation**: Required fields ensure essential information is provided
- **Auto-Labeling**: Automatic label assignment for easier issue management

## 📝 Pull Request Template

The PR template (`pull_request_template.md`) includes:

- **Type of Change**: Clear categorization of changes
- **Component Tracking**: Checkboxes for all monorepo components
- **Testing Guidelines**: Comprehensive testing checklist
- **Security & Performance**: Security and performance considerations
- **Deployment Notes**: Environment variables and deployment requirements
- **Monorepo Considerations**: PNPM workspace-specific checks

## 🔗 Contact Links

The `config.yml` file provides additional contact options:
- GitHub Discussions for community questions
- Private security contact for critical vulnerabilities
- Documentation links for self-service help

## 🎯 Benefits for Maintainers

1. **Consistent Issue Reports**: Structured information makes triaging easier
2. **Auto-Labeling**: Reduces manual work in issue management
3. **Component Identification**: Quickly identify which part of the monorepo is affected
4. **Security Best Practices**: Responsible disclosure workflow for security issues
5. **Quality Assurance**: PR template ensures thorough testing and documentation

## 🚀 Benefits for Contributors

1. **Clear Guidance**: Step-by-step guidance for reporting issues and submitting PRs
2. **Reduced Back-and-Forth**: Comprehensive templates reduce the need for follow-up questions
3. **Educational**: Templates help contributors understand the platform better
4. **Professional**: Creates a professional contribution experience

## 📊 Template Usage

Each template is designed to:
- Gather essential information efficiently
- Provide clear guidance to users
- Support the specific needs of an educational platform
- Handle the complexity of a monorepo structure
- Maintain security and performance standards

## 🔄 Maintenance

When updating templates:
1. Ensure YAML syntax is valid
2. Test required field validation
3. Update component lists if new parts are added to the platform
4. Keep labels consistent with repository label schema
5. Update contact information if needed

---

**These templates are specifically designed for the Ignite educational platform and its MERN stack architecture with Google OAuth, PDF management, and Android app capabilities.**