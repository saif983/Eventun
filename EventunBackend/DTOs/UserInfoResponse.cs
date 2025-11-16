using System.Text.Json.Serialization;

namespace EventunBackend.DTOs
{
    public class UserInfoResponse
    {
        [JsonPropertyName("email")]
        public string? Email { get; set; }
        
        [JsonPropertyName("name")]
        public string? Name { get; set; }
        
        [JsonPropertyName("picture")]
        public string? Picture { get; set; }
    }
}
