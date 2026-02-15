import requests
import os

def generate_content(keyword):
    # Use Gemini to write a post with affiliate placeholders
    prompt = f"Write a 1000-word SEO article for {keyword}. Focus on low-cost PC value. Include H2/H3 tags and a comparison table placeholder."
    # API call to Gemini here...
    return "AI Generated Content"

def post_to_wp(title, content):
    url = os.getenv('WP_URL')
    auth = (os.getenv('WP_USERNAME'), os.getenv('WP_APP_PASSWORD'))
    data = {
        'title': title,
        'content': content,
        'status': 'publish'
    }
    response = requests.post(url, json=data, auth=auth)
    return response.status_code

# Main loop picks a new keyword from your CSV and runs