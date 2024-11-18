use strict;
use warnings;
use LWP::UserAgent;
use HTTP::Request::Common qw(POST);
use JSON;

# Define the API endpoint and credentials
my $url = "https://lmc.isb.cn/api/v1/rest/context/destiny/auth/accessToken";
my $client_id = "oZHJSaMt.v0vV.Qc9871bonTldzey_7=";     # Replace with your actual client_id
my $client_secret = "NkavdaTUGhKy/-dw9MlAWs5r21jxu9k="; # Replace with your actual client_secret

# Initialize user agent
my $ua = LWP::UserAgent->new;

# Set up the form data for the POST request
my $response = $ua->request(
    POST $url,
    Content_Type => 'application/x-www-form-urlencoded',
    Content      => [
        grant_type    => 'client_credentials',
        client_id     => $client_id,
        client_secret => $client_secret
    ]
);

# Check if the request was successful
if ($response->is_success) {
    # Decode JSON response
    my $json_response = decode_json($response->decoded_content);
    my $access_token = $json_response->{access_token};

    print "Access Token: $access_token\n";
} else {
    print "Failed to get access token: ", $response->status_line, "\n";
    print $response->decoded_content, "\n";
}
