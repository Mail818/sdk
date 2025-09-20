# Hugo Integration for Mail818

This directory contains Hugo shortcode and partial templates for easily integrating Mail818 email collection forms into your Hugo static site.

## Installation

1. Copy the files to your Hugo site:
   - `shortcode-mail818-form.html` → `layouts/shortcodes/mail818-form.html`
   - `partial-mail818-form.html` → `layouts/partials/mail818-form.html`

2. Configure your site's `config.toml` (or `config.yaml`):

```toml
[params.mail818]
  apiKey = "your-api-key"
  projectId = "your-project-id"
  apiUrl = "https://api.mail818.com" # Optional, defaults to production API
```

## Usage

### Using the Shortcode

In your content files (Markdown):

```markdown
## Subscribe to Our Newsletter

{{< mail818-form >}}
```

With custom parameters:

```markdown
{{< mail818-form 
  title="Get Weekly Updates"
  description="The best content delivered to your inbox"
  button="Join Now"
  success="Welcome aboard!"
  show-name="true"
  show-message="false"
>}}
```

### Using the Partial

In your templates:

```html
<!-- Basic usage with site config -->
{{ partial "mail818-form.html" . }}

<!-- With custom parameters -->
{{ partial "mail818-form.html" (dict 
  "title" "Newsletter Signup"
  "buttonText" "Subscribe"
  "theme" "dark"
  "compact" true
  "context" .
) }}
```

## Parameters

Both the shortcode and partial support these parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `api-key` / `apiKey` | Site config | Your Mail818 API key |
| `project-id` / `projectId` | Site config | Your Mail818 project ID |
| `api-url` / `apiUrl` | `https://api.mail818.com` | API endpoint URL |
| `title` | "Subscribe to Our Newsletter" | Form heading |
| `description` | Varies | Form description text |
| `button` / `buttonText` | "Subscribe" | Submit button text |
| `success` / `successMessage` | "Thank you for subscribing!" | Success message |
| `show-name` / `showName` | `true` | Show name field |
| `show-message` / `showMessage` | `true` (shortcode), `false` (partial) | Show message field |
| `theme` | "light" | Theme: "light" or "dark" (partial only) |
| `compact` | `false` | Compact layout (partial only) |

## Features

- **Responsive Design**: Works on all screen sizes
- **Dark Mode Support**: Partial includes dark theme option
- **Spam Prevention**: Built-in honeypot field
- **Validation**: Client-side email validation
- **Error Handling**: User-friendly error messages
- **Analytics**: Automatic Google Analytics tracking (if available)
- **Accessibility**: ARIA labels and keyboard navigation
- **No Dependencies**: SDK loads automatically from CDN

## Styling

### Custom CSS

The forms use BEM-style class names prefixed with `mail818-` for easy customization:

```css
/* Override primary color */
.mail818-widget {
  --mail818-primary: #10b981;
  --mail818-primary-hover: #059669;
}

/* Custom button style */
.mail818-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 1.125rem;
  padding: 0.75rem 1.5rem;
}
```

### CSS Variables

Available CSS custom properties:

- `--mail818-primary`: Primary button color
- `--mail818-primary-hover`: Button hover color
- `--mail818-success`: Success message color
- `--mail818-error`: Error message color
- `--mail818-text`: Main text color
- `--mail818-text-muted`: Secondary text color
- `--mail818-bg`: Background color
- `--mail818-bg-secondary`: Form background
- `--mail818-border`: Border color
- `--mail818-radius`: Border radius

## Examples

### Homepage Hero Section

```html
<!-- layouts/index.html -->
<section class="hero">
  <h1>Welcome to Our Site</h1>
  <p>Stay updated with our latest news</p>
  {{ partial "mail818-form.html" (dict 
    "compact" true
    "showMessage" false
    "context" .
  ) }}
</section>
```

### Blog Sidebar

```html
<!-- layouts/partials/sidebar.html -->
<aside class="sidebar">
  <div class="widget">
    {{ partial "mail818-form.html" (dict
      "title" "Blog Updates"
      "description" "New posts every week"
      "theme" "dark"
      "context" .
    ) }}
  </div>
</aside>
```

### Article Footer

```markdown
<!-- content/blog/my-post.md -->
---
title: "My Blog Post"
---

Article content here...

---

If you enjoyed this article, subscribe for more:

{{< mail818-form 
  title="Enjoyed this article?"
  description="Get similar content delivered to your inbox"
  show-message="false"
>}}
```

## Troubleshooting

### Form not appearing

1. Check that files are in correct directories
2. Verify API key and project ID in config
3. Check browser console for errors
4. Ensure JavaScript is enabled

### Submissions failing

1. Verify API credentials are correct
2. Check that project exists and is active
3. Look for rate limiting errors
4. Check network connectivity

### Styling issues

1. Check for CSS conflicts with theme
2. Use more specific selectors if needed
3. Verify CSS variables are supported

## Support

For issues or questions:
- Documentation: https://mail818.com/docs
- GitHub: https://github.com/mail818/sdk
- Support: support@mail818.com